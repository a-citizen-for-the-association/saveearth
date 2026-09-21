// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Address-only membership registry. No personal data is stored;
///         an Ethereum/EVM address is the sole identifier for a member.
contract Membership is Ownable {
    struct Member {
        bool isMember;
        address addedBy;
        uint40 addedAt;
    }

    mapping(address => Member) private members;
    address[] private memberList;
    /// @dev 1-based index into memberList; 0 means "not present".
    mapping(address => uint256) private memberListIndex;

    event MemberAdded(address indexed member, address indexed addedBy, uint256 timestamp);
    event MemberRemoved(address indexed member, address indexed removedBy);

    error NotAMember(address account);
    error AlreadyAMember(address account);
    error ZeroAddress();
    error NotAuthorizedToRemove(address caller, address target);

    constructor(address initialOwner) Ownable(initialOwner) {
        _addMember(initialOwner, address(0));
    }

    /// @notice Adds `newMember`. Callable by any existing member, unilaterally —
    ///         no approval or quorum from other members is required.
    function addMember(address newMember) external {
        if (!members[msg.sender].isMember) revert NotAMember(msg.sender);
        if (newMember == address(0)) revert ZeroAddress();
        if (members[newMember].isMember) revert AlreadyAMember(newMember);
        _addMember(newMember, msg.sender);
    }

    /// @notice Removes `member`. Callable by the member themself (self-removal)
    ///         or by the contract Owner. Members cannot remove each other.
    function removeMember(address member) external {
        if (msg.sender != member && msg.sender != owner()) {
            revert NotAuthorizedToRemove(msg.sender, member);
        }
        if (!members[member].isMember) revert NotAMember(member);
        _removeMember(member, msg.sender);
    }

    function isMember(address account) external view returns (bool) {
        return members[account].isMember;
    }

    function getMember(address account) external view returns (Member memory) {
        return members[account];
    }

    function memberCount() external view returns (uint256) {
        return memberList.length;
    }

    function memberAt(uint256 index) external view returns (address) {
        return memberList[index];
    }

    /// @notice Disabled. A non-upgradeable contract must always retain an Owner
    ///         so that `removeMember` and the future Council `transferOwnership`
    ///         migration (ADR-0004) stay available.
    function renounceOwnership() public pure override {
        revert("Membership: renounce disabled");
    }

    function _addMember(address account, address addedBy) private {
        // casting to 'uint40' is safe because it doesn't overflow until the year 36812
        // forge-lint: disable-next-line(unsafe-typecast)
        members[account] = Member({ isMember: true, addedBy: addedBy, addedAt: uint40(block.timestamp) });
        memberList.push(account);
        memberListIndex[account] = memberList.length;
        emit MemberAdded(account, addedBy, block.timestamp);
    }

    function _removeMember(address account, address removedBy) private {
        uint256 index1 = memberListIndex[account];
        uint256 lastIndex1 = memberList.length;
        if (index1 != lastIndex1) {
            address lastAddress = memberList[lastIndex1 - 1];
            memberList[index1 - 1] = lastAddress;
            memberListIndex[lastAddress] = index1;
        }
        memberList.pop();
        delete memberListIndex[account];
        delete members[account];
        emit MemberRemoved(account, removedBy);
    }
}
