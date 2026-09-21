// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import { Script, console2 } from "forge-std/Script.sol";
import { Membership } from "../src/Membership.sol";
import { GovernanceToken } from "../src/GovernanceToken.sol";
import { CommunityBoard } from "../src/CommunityBoard.sol";

/// @notice Deploys Membership, GovernanceToken, and CommunityBoard on
///         whichever chain `--rpc-url`/`--chain` points to (ADR-0002: only
///         one Mainnet is ever live at a time; Testnets may both be used).
///         CommunityBoard references Membership and GovernanceToken
///         immutably (ADR-0005, ADR-0006), so both must be deployed first.
///
/// Usage:
///   OWNER_ADDRESS=0x... forge script script/Deploy.s.sol:Deploy \
///     --chain sepolia --account <keystore-account> --broadcast --verify
contract Deploy is Script {
    function run() external returns (Membership membership, GovernanceToken token, CommunityBoard board) {
        address owner = vm.envAddress("OWNER_ADDRESS");

        vm.startBroadcast();
        membership = new Membership(owner);
        token = new GovernanceToken(owner);
        board = new CommunityBoard(owner, address(membership), address(token));
        vm.stopBroadcast();

        console2.log("Chain ID          :", block.chainid);
        console2.log("Owner             :", owner);
        console2.log("Membership        :", address(membership));
        console2.log("GovernanceToken   :", address(token));
        console2.log("CommunityBoard    :", address(board));

        _writeDeploymentRecord(owner, address(membership), address(token), address(board));
    }

    /// @dev Writes ./deployments/<chainId>.json so the frontend's chainId -> address
    ///      map can be generated from a single source of truth. Requires the
    ///      fs_permissions entry in foundry.toml.
    function _writeDeploymentRecord(address owner, address membership, address governanceToken, address board) private {
        vm.createDir("deployments", true);
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");

        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "owner", owner);
        vm.serializeAddress(key, "membership", membership);
        vm.serializeAddress(key, "governanceToken", governanceToken);
        string memory json = vm.serializeAddress(key, "communityBoard", board);

        vm.writeJson(json, path);
        console2.log("Deployment record written:", path);
    }
}
