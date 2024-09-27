import { ethers } from "ethers";
import { Dropdown, DropdownButton } from "react-bootstrap";

const Navigation = ({ account, setAccount }) => {
  const connectHandler = async () => {
    if (window.ethereum !== undefined) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const acc = await signer.getAddress();
      setAccount(acc);
    }
  };

  const disconnectHandler = async () => {
    setAccount(null);
  };

  return (
    <nav>
      <div className="nav__brand">
        <h1>AI NFT Generator</h1>
      </div>

      {account ? (
        <DropdownButton
          size="lg"
          className="d-flex justify-content-center"
          title={account.slice(0, 6) + "..." + account.slice(38, 42)}
        >
          <Dropdown.Item onClick={disconnectHandler}>Disconnect</Dropdown.Item>
        </DropdownButton>
      ) : (
        <button type="button" className="nav__connect" onClick={connectHandler}>
          Connect
        </button>
      )}
    </nav>
  );
};

export default Navigation;
