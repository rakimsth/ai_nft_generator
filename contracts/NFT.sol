// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract NFT is ERC721URIStorage,Pausable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address public owner;
    uint256 public cost;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _cost
    ) ERC721(_name, _symbol) {
        owner = msg.sender;
        cost = _cost;
    }

    function mint(string memory tokenURI) public payable whenNotPaused{
        require(msg.value >= cost);

        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }

    function withdraw() public {
        require(msg.sender == owner);
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success);
    }

// Function to pause the contract (only owner can call)
    function pause() public {
        require(msg.sender == owner, "Only owner can pause the contract");
        _pause();
    }
    // Function to unpause the contract (only owner can call)
    function unpause() public {
        require(msg.sender == owner, "Only owner can unpause the contract");
        _unpause();
    }
    // Function to update the minting cost (only owner can call)
    function updateCost(uint256 _newCost) public {
        require(msg.sender == owner, "Only owner can update the cost");
        cost = _newCost;
    }
}
