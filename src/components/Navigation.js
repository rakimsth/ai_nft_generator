import { ConnectButton } from "@rainbow-me/rainbowkit";

const Navigation = () => {
  return (
    <nav>
      <div className="nav__brand">
        <h1>AI NFT Generator</h1>
      </div>
      <div className="d-flex flex-row-reverse">
        <ConnectButton />
      </div>
    </nav>
  );
};

export default Navigation;
