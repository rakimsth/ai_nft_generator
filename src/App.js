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
import { Alert } from "react-bootstrap";

function App() {
  const [provider, setProvider] = useState(null);
  const [nft, setNFT] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [imgData, setImgData] = useState(null);
  const [url, setURL] = useState(null);

  const [message, setMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [err, setErr] = useState("");

  const loadBlockchainData = useCallback(async () => {
    if (window.ethereum === undefined) {
      alert("Wallet is not detected");
      return;
    } else {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await ethProvider.getNetwork();

      const nftAddress = config[network.chainId]?.nft?.address;
      // To prevent nft not defined error
      if (!nftAddress) {
        console.error("NFT address not found for this network");
        return;
      }
      const nft = new ethers.Contract(nftAddress, NFT, ethProvider);
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
    setImgData(null);
    setIsWaiting(true);
    // Call AI API to generate a image based on description
    const imageUrl = await createImage();
    if (imageUrl) setIsWaiting(false);
  };

  const handleMint = async (e) => {
    e.preventDefault();
    if (!imgData) {
      window.alert("Please generate image to start mint");
      return;
    }
    setIsWaiting(true);
    // Upload image to IPFS (Pinata)
    uploadImage(imgData)
      .then((url) => mintImage(url))
      .then(() => {
        setIsWaiting(false);
        setMessage("");
      });
  };

  const createImage = async () => {
    setErr("");
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
    setImgData(data);
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
        await pinata.updateMetadata({
          cid: IpfsHash,
          name: name,
          keyValues: {
            name: name,
            description: description,
            image: `https://${process.env.REACT_APP_PINATA_GATEWAY_URL}/ipfs/${IpfsHash}`,
          },
        });
        const url = `https://${process.env.REACT_APP_PINATA_GATEWAY_URL}/ipfs/${IpfsHash}`;
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
        .mint(tokenURI, { value: ethers.parseUnits("0.01", "ether") });
      await transaction.wait();
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    loadBlockchainData();
  }, [loadBlockchainData]);

  return (
    <div className="container">
      <Navigation />
      <div className="form">
        <form onSubmit={submitHandler} style={{ width: "40rem" }}>
          <input
            className="form-control"
            style={{ width: "40rem" }}
            type="text"
            placeholder="Create a name..."
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <textarea
            className="form-control"
            type="text"
            placeholder="Create a description..."
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
          ></textarea>
          <div className="d-flex justify-content-between">
            <input type="submit" value="Create" />
            &nbsp;
            <input type="button" value="Mint" onClick={handleMint} />
          </div>
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

      {err && (
        <Alert variant="danger">
          {err.substring(
            0,
            err.indexOf("(") >= 0 ? err.indexOf("(") : err.length
          )}
        </Alert>
      )}

      {!isWaiting && !err && url && (
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
