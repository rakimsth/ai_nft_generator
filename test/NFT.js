const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  //return ethers.utils.parseUnits(n.toString(), 'ether')
  return ethers.parseUnits(n.toString(), 'ether')
}

describe('NFT', () => {
  let deployer, minter
  let nft

  const NAME = "AI Generated NFT"
  const SYMBOL = "AINFT"
  const COST = tokens(1) // 1 ETH
  const URL = "https://ipfs.io/ipfs/bafyreid4an6ng6e6hok56l565eivozra3373bo6funw3p5mhq5oonew6u4/metadata.json"

  beforeEach(async () => {
    // Setup accounts
    [deployer, minter] = await ethers.getSigners()

    // Deploy Real Estate
    const NFT = await ethers.getContractFactory('NFT')
    nft = await NFT.deploy(NAME, SYMBOL, COST)
    await nft.waitForDeployment()
    // Mint 
    const transaction = await nft.connect(minter).mint(URL, { value: COST })
    await transaction.wait()

  })

  describe('Deployment', () => {
    it('Returns owner', async () => {
      const result = await nft.owner()
      expect(result).to.be.equal(deployer.address)
    })

    it('Returns cost', async () => {
      const result = await nft.cost()
      expect(result).to.be.equal(COST)
    })
  })

  describe('Minting', () => {
    it('Returns owner', async () => {
      const result = await nft.ownerOf("1")
      expect(result).to.be.equal(minter.address)
    })

    it('Returns URI', async () => {
      const result = await nft.tokenURI("1")
      expect(result).to.be.equal(URL)
    })

    it('Updates total supply', async () => {
      const result = await nft.totalSupply()
      expect(result).to.be.equal("1")
    })

    it('Pauses minting', async () => {
      await nft.pause()
    // Check if minting is paused by attempting to mint a token
      await expect(nft.connect(minter).mint(URL, { value: COST }))
        .to.be.revertedWith('Pausable: paused')  // Ensure it reverts with pause error message
    })

    it('Unpauses minting', async () => {
         // First, ensure the contract is paused
      await nft.connect(deployer).pause()

      // Now, unpause the contract
      await nft.connect(deployer).unpause()

      // After unpausing, minting should succeed
      await nft.connect(minter).mint(URL, { value: COST })

      const result = await nft.ownerOf("2")
      expect(result).to.be.equal(minter.address) // Mint should succeed and assign token
    })

     // Test updating the cost
    it('Updates minting cost', async () => {
      const NEW_COST = ethers.parseUnits('2', 'ether')

      // Owner updates the minting cost
      await nft.connect(deployer).updateCost(NEW_COST)

      // Check if the cost was updated correctly
      const result = await nft.cost()
      expect(result).to.be.equal(NEW_COST)
    })

  })

  describe('Withdrawing', () => {
    let balanceBefore

    beforeEach(async () => {
      balanceBefore = await ethers.provider.getBalance(deployer.address)
      const transaction = await nft.connect(deployer).withdraw()
      await transaction.wait()

    })

    it('Updates the owner balance', async () => {
      const result = await ethers.provider.getBalance(deployer.address)
      expect(result).to.be.greaterThan(balanceBefore)
    })

    it('Updates the contract balance', async () => {
      const result = await ethers.provider.getBalance(await nft.getAddress())
      expect(result).to.equal(0)
    })
  })
})