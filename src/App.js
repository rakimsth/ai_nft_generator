import { useCallback, useState, useEffect } from "react";
import { pinata } from "./utils/pinata";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import axios from "axios";

// Components
import Spinner from "react-bootstrap/Spinner";
import Navigation from "./components/Navigation";

// ABIs
import NFT from "./abis/NFT.json";

// Config
import config from "./config.json";

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [nft, setNFT] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [url, setURL] = useState(null);

  const [message, setMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);

  const loadBlockchainData = useCallback(async () => {
    if (window.ethereum === undefined) {
      alert("Metamask wallet is not installed");
      return;
    } else {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await ethProvider.getNetwork();
      const nft = new ethers.Contract(
        config[network.chainId].nft.address,
        NFT,
        ethProvider
      );
      setNFT(nft);
      setProvider(ethProvider);
    }
  }, []);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (name === "" || description === "") {
      window.alert("Please provide a name and description");
      return;
    }
    setIsWaiting(true);
    // Call AI API to generate a image based on description
    const imageData = await createImage();
    // Upload image to IPFS (Pinata)
    uploadImage(imageData)
      .then((url) => mintImage(url))
      .then(() => {
        setIsWaiting(false);
        setMessage("");
      });
  };

  const createImage = async () => {
    setMessage("Generating Image...");

    // You can replace this with different model API's
    const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`;

    // Send the request
    const response = await axios({
      url: URL,
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        inputs: description,
        options: { wait_for_model: true },
      }),
      responseType: "arraybuffer",
    });

    const type = response.headers["content-type"];
    const data = response.data;

    const base64data = Buffer.from(data).toString("base64");
    const img = `data:${type};base64,` + base64data; // <-- This is so we can render it on the page
    setImage(img);

    return data;
  };

  const uploadImage = async (imageData) => {
    try {
      setMessage("Uploading Image...");
      // Send request to store image
      const file = new File([imageData], "image.jpeg", { type: "image/jpeg" });
      const { IpfsHash } = await pinata.upload.file(file).addMetadata({
        name: name,
        keyValues: {
          name: name,
          description: description,
        },
      });
      if (IpfsHash) {
        const url = `https://ipfs.io/ipfs/${IpfsHash}`;
        setURL(url);
        return url;
      }
    } catch (e) {
      console.log({ e });
    }
  };

  const mintImage = async (tokenURI) => {
    try {
      setMessage("Waiting for Mint...");
      const signer = await provider.getSigner();
      const transaction = await nft
        .connect(signer)
        .mint(tokenURI, { value: ethers.parseUnits("0.1", "ether") });
      await transaction.wait();
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    loadBlockchainData();
  }, [loadBlockchainData]);

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <div className="form">
        <form onSubmit={submitHandler}>
          <input
            type="text"
            placeholder="Create a name..."
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <input
            type="text"
            placeholder="Create a description..."
            onChange={(e) => setDescription(e.target.value)}
          />
          <input type="submit" value="Create & Mint" />
        </form>

        <div className="image">
          {!isWaiting && image ? (
            <img src={image} alt="AI generated NFT pic" />
          ) : isWaiting ? (
            <div className="image__placeholder">
              <Spinner animation="border" />
              <p>{message}</p>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>

      {!isWaiting && url && (
        <p>
          View&nbsp;
          <a href={url} target="_blank" rel="noreferrer">
            Metadata
          </a>
        </p>
      )}
    </div>
  );
}

export default App;
