// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @title TipJar — On-chain tip jar for creators
/// @notice Fans send USDC tips with optional messages. Creator can withdraw.
contract TipJar {
    struct Tip {
        address tipper;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    address public immutable creator;
    string public creatorName;
    IERC20 public immutable usdc;

    Tip[] public tips;
    uint256 public totalReceived;

    event TipReceived(address indexed tipper, uint256 amount, string message);
    event Withdrawn(address indexed creator, uint256 amount);

    error OnlyCreator();
    error ZeroAmount();
    error TransferFailed();

    modifier onlyCreator() {
        if (msg.sender != creator) revert OnlyCreator();
        _;
    }

    constructor(address _creator, string memory _creatorName, address _usdc) {
        creator = _creator;
        creatorName = _creatorName;
        usdc = IERC20(_usdc);
    }

    /// @notice Send a USDC tip to this creator
    /// @param amount Amount of USDC (6 decimals)
    /// @param message Optional message from the tipper
    function tip(uint256 amount, string calldata message) external {
        if (amount == 0) revert ZeroAmount();

        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        tips.push(Tip({
            tipper: msg.sender,
            amount: amount,
            message: message,
            timestamp: block.timestamp
        }));

        totalReceived += amount;
        emit TipReceived(msg.sender, amount, message);
    }

    /// @notice Creator withdraws all USDC from the tip jar
    function withdraw() external onlyCreator {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance == 0) revert ZeroAmount();

        bool ok = usdc.transfer(creator, balance);
        if (!ok) revert TransferFailed();

        emit Withdrawn(creator, balance);
    }

    /// @notice Get the number of tips received
    function tipCount() external view returns (uint256) {
        return tips.length;
    }

    /// @notice Get a page of tips (most recent first)
    /// @param offset Start index from the end
    /// @param limit Max number of tips to return
    function getTips(uint256 offset, uint256 limit) external view returns (Tip[] memory) {
        uint256 len = tips.length;
        if (offset >= len) return new Tip[](0);

        uint256 end = len - offset;
        uint256 start = end > limit ? end - limit : 0;
        uint256 count = end - start;

        Tip[] memory page = new Tip[](count);
        for (uint256 i = 0; i < count; i++) {
            page[i] = tips[start + i];
        }
        return page;
    }
}
