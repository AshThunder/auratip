// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TipJar} from "./TipJar.sol";

/// @title TipJarFactory — Deploy and index TipJar instances
contract TipJarFactory {
    address public immutable usdc;

    mapping(address => address) public tipJars; // creator => tipJar
    address[] public allTipJars;

    event TipJarCreated(address indexed creator, address tipJar, string creatorName);

    error AlreadyExists();

    constructor(address _usdc) {
        usdc = _usdc;
    }

    /// @notice Deploy a new TipJar for the caller
    /// @param name Creator's display name
    function createTipJar(string calldata name) external returns (address) {
        if (tipJars[msg.sender] != address(0)) revert AlreadyExists();

        TipJar jar = new TipJar(msg.sender, name, usdc);
        address jarAddr = address(jar);

        tipJars[msg.sender] = jarAddr;
        allTipJars.push(jarAddr);

        emit TipJarCreated(msg.sender, jarAddr, name);
        return jarAddr;
    }

    /// @notice Get the TipJar address for a creator
    function getTipJar(address creator) external view returns (address) {
        return tipJars[creator];
    }

    /// @notice Get all deployed TipJar addresses
    function getAllTipJars() external view returns (address[] memory) {
        return allTipJars;
    }

    /// @notice Get total number of tip jars
    function tipJarCount() external view returns (uint256) {
        return allTipJars.length;
    }
}
