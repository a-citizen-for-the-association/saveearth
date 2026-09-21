// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IMembership } from "./IMembership.sol";

/// @notice Owner-managed lists of chat room links and mission/goal messages.
///         Entries are soft-deleted (active flag) so ids stay stable for callers.
/// @dev References a Membership contract (immutable, one-directional —
///      Membership knows nothing about CommunityBoard) so that admin actions
///      require not just holding the Owner key but currently being a member
///      of the association it manages (ADR-0005).
contract CommunityBoard is Ownable {
    struct ChatRoom {
        string label;
        string url;
        bool active;
    }

    struct Message {
        string content;
        bool active;
    }

    IMembership public immutable membership;
    /// @dev The official SaveEarth GovernanceToken address (ADR-0006). Purely
    ///      a marker — no function on it is ever called from this contract.
    address public immutable governanceToken;

    mapping(uint256 => ChatRoom) private chatRooms;
    uint256 public chatRoomCount;

    mapping(uint256 => Message) private messages;
    uint256 public messageCount;

    event ChatRoomAdded(uint256 indexed id, string label, string url);
    event ChatRoomRemoved(uint256 indexed id);
    event MessageAdded(uint256 indexed id, string content);
    event MessageRemoved(uint256 indexed id);

    error EmptyValue();
    error NotFound(uint256 id);
    error AlreadyRemoved(uint256 id);
    error OwnerNotAMember(address owner);
    error InvalidMembership(address membershipAddress);
    error InvalidGovernanceToken(address governanceTokenAddress);
    error MembershipAndGovernanceTokenMustDiffer(address value);

    constructor(address initialOwner, address membershipAddress, address governanceTokenAddress) Ownable(initialOwner) {
        // Can't verify `membershipAddress`/`governanceTokenAddress` actually
        // implement what they claim to (that's the accepted deploy-time
        // trust boundary, ADR-0005/ADR-0006) — but since both are immutable,
        // catching a plain wrong-address mistake (EOA, address(0), typo)
        // here turns a silent brick into an immediate deploy-time revert
        // instead of a surprise on first use.
        if (membershipAddress.code.length == 0) revert InvalidMembership(membershipAddress);
        if (governanceTokenAddress.code.length == 0) {
            revert InvalidGovernanceToken(governanceTokenAddress);
        }
        // Both checks above only prove "has code" — they can't tell the two
        // arguments apart, so a deployer who transposes them (e.g. passes
        // GovernanceToken where Membership belongs) would sail through both
        // checks and brick every admin function behind onlyOwnerWhoIsMember
        // (immutably, no recovery short of redeploy). This at least catches
        // the degenerate case of passing the same address for both; a full
        // swap between two distinct real contracts can't be caught without
        // a semantic check, which is out of scope (ADR-0005/ADR-0006).
        if (membershipAddress == governanceTokenAddress) {
            revert MembershipAndGovernanceTokenMustDiffer(membershipAddress);
        }
        membership = IMembership(membershipAddress);
        governanceToken = governanceTokenAddress;
    }

    /// @dev Owner-only, same as `onlyOwner`, plus: the Owner must currently be
    ///      a member of `membership`. An Owner who has left the association
    ///      loses admin rights here until they rejoin or ownership moves to
    ///      an address that is a member (ADR-0005).
    modifier onlyOwnerWhoIsMember() {
        _checkOwner();
        if (!membership.isMember(msg.sender)) revert OwnerNotAMember(msg.sender);
        _;
    }

    function addChatRoom(string calldata label, string calldata url)
        external
        onlyOwnerWhoIsMember
        returns (uint256 id)
    {
        if (bytes(label).length == 0 || bytes(url).length == 0) revert EmptyValue();
        id = chatRoomCount++;
        chatRooms[id] = ChatRoom({ label: label, url: url, active: true });
        emit ChatRoomAdded(id, label, url);
    }

    function removeChatRoom(uint256 id) external onlyOwnerWhoIsMember {
        if (id >= chatRoomCount) revert NotFound(id);
        ChatRoom storage room = chatRooms[id];
        if (!room.active) revert AlreadyRemoved(id);
        room.active = false;
        emit ChatRoomRemoved(id);
    }

    function addMessage(string calldata content) external onlyOwnerWhoIsMember returns (uint256 id) {
        if (bytes(content).length == 0) revert EmptyValue();
        id = messageCount++;
        messages[id] = Message({ content: content, active: true });
        emit MessageAdded(id, content);
    }

    function removeMessage(uint256 id) external onlyOwnerWhoIsMember {
        if (id >= messageCount) revert NotFound(id);
        Message storage message = messages[id];
        if (!message.active) revert AlreadyRemoved(id);
        message.active = false;
        emit MessageRemoved(id);
    }

    function getChatRoom(uint256 id) external view returns (ChatRoom memory) {
        return chatRooms[id];
    }

    function getMessage(uint256 id) external view returns (Message memory) {
        return messages[id];
    }

    /// @notice Disabled. A non-upgradeable contract must always retain an Owner
    ///         so that chat rooms/messages remain manageable and the future
    ///         Council `transferOwnership` migration (ADR-0004) stays available.
    function renounceOwnership() public pure override {
        revert("CommunityBoard: renounce disabled");
    }

    function getActiveChatRooms() external view returns (ChatRoom[] memory active) {
        uint256 activeCount = _countActiveChatRooms();
        active = new ChatRoom[](activeCount);
        uint256 cursor = 0;
        for (uint256 i = 0; i < chatRoomCount; i++) {
            if (chatRooms[i].active) {
                active[cursor] = chatRooms[i];
                cursor++;
            }
        }
    }

    function getActiveMessages() external view returns (Message[] memory active) {
        uint256 activeCount = _countActiveMessages();
        active = new Message[](activeCount);
        uint256 cursor = 0;
        for (uint256 i = 0; i < messageCount; i++) {
            if (messages[i].active) {
                active[cursor] = messages[i];
                cursor++;
            }
        }
    }

    function _countActiveChatRooms() private view returns (uint256 count) {
        for (uint256 i = 0; i < chatRoomCount; i++) {
            if (chatRooms[i].active) count++;
        }
    }

    function _countActiveMessages() private view returns (uint256 count) {
        for (uint256 i = 0; i < messageCount; i++) {
            if (messages[i].active) count++;
        }
    }
}
