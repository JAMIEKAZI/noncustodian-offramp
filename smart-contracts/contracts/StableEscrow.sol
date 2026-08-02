// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StableEscrow {
    using SafeERC20 for IERC20;

    address public admin; // Your backend server wallet
    address public roqquTreasury; 
    
    mapping(address => bool) public allowedTokens;
    
    struct Escrow {
        address user;
        address token;
        uint256 amount;
        uint256 unlockTime;
        bool isCompleted;
    }

    mapping(bytes32 => Escrow) public escrows;

    event EscrowLocked(bytes32 indexed txnId, address indexed user, uint256 amount, string bankAccount);
    event EscrowReleased(bytes32 indexed txnId);
    event EscrowRefunded(bytes32 indexed txnId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized backend");
        _;
    }

    constructor(address _roqquTreasury) {
        admin = msg.sender;
        roqquTreasury = _roqquTreasury;
        
        // Example Base Network USDC Whitelist
        allowedTokens[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913] = true; 
    }

    // Step 1: User locks crypto
    function lockFunds(bytes32 _txnId, address _token, uint256 _amount, string calldata _bankAccount) external {
        require(allowedTokens[_token], "Unsupported stablecoin");
        require(escrows[_txnId].amount == 0, "Transaction ID exists");

        // Transfer crypto from User to this Smart Contract
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        escrows[_txnId] = Escrow({
            user: msg.sender,
            token: _token,
            amount: _amount,
            unlockTime: block.timestamp + 30 minutes, // 30 min safety timer
            isCompleted: false
        });

        emit EscrowLocked(_txnId, msg.sender, _amount, _bankAccount);
    }

    // Step 2: Backend releases to Roqqu after Naira settles
    function releaseToPartner(bytes32 _txnId) external onlyAdmin {
        Escrow storage esc = escrows[_txnId];
        require(!esc.isCompleted, "Already processed");
        
        esc.isCompleted = true;
        IERC20(esc.token).safeTransfer(roqquTreasury, esc.amount);
        
        emit EscrowReleased(_txnId);
    }

    // Step 3: Refund if bank fails and timer expires
    function refundUser(bytes32 _txnId) external {
        Escrow storage esc = escrows[_txnId];
        require(!esc.isCompleted, "Already processed");
        require(block.timestamp > esc.unlockTime, "Safety timer not expired yet");
        
        esc.isCompleted = true;
        IERC20(esc.token).safeTransfer(esc.user, esc.amount);
        
        emit EscrowRefunded(_txnId);
    }
}