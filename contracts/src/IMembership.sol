// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice Minimal interface other contracts use to check Membership status
///         without depending on the full Membership implementation.
interface IMembership {
    function isMember(address account) external view returns (bool);
}
