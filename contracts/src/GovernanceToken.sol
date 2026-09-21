// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply governance token, minted once at deploy time.
/// @dev No Ownable, no further minting/burning capability — the entire
///      supply is fixed forever the moment this contract is deployed
///      (ADR-0006). This is deliberately not DAO tooling (no voting/
///      proposal logic); it exists only so a governance token address
///      exists to reference from CommunityBoard, ahead of a possible
///      future DAO.
contract GovernanceToken is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000_000 * 10 ** 18;

    constructor(address initialHolder) ERC20("SaveEarth Governance Token", "SEG") {
        _mint(initialHolder, INITIAL_SUPPLY);
    }
}
