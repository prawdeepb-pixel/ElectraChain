// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ElectraChain Energy Trading Network
/// @notice Academic smart-grid settlement contract for local blockchain presentation.
contract EnergyTrading {
    enum RequestStatus {
        PendingTransactionApproval,
        Rejected,
        BlockchainConfirmed
    }

    struct Listing {
        uint256 id;
        address producer;
        uint256 energyAmount;
        uint256 pricePerToken;
        string energySource;
        string location;
        bool approved;
        bool active;
    }

    struct PurchaseRequest {
        uint256 id;
        uint256 listingId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 totalPrice;
        RequestStatus status;
    }

    address public admin;
    uint256 public nextListingId = 1;
    uint256 public nextRequestId = 1;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => PurchaseRequest) public purchaseRequests;
    mapping(address => bool) public approvedUsers;
    mapping(address => uint256) public energyCoinBalances;
    mapping(address => uint256) public energyTokenBalances;

    event UserApproved(address indexed user);
    event ListingCreated(uint256 indexed listingId, address indexed producer);
    event ListingApproved(uint256 indexed listingId);
    event PurchaseRequested(uint256 indexed requestId, uint256 indexed listingId, address indexed buyer);
    event PurchaseRejected(uint256 indexed requestId);
    event PurchaseConfirmed(uint256 indexed requestId, bytes32 transactionHash);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyApproved() {
        require(approvedUsers[msg.sender], "User not approved");
        _;
    }

    constructor() {
        admin = msg.sender;
        approvedUsers[msg.sender] = true;
        energyCoinBalances[msg.sender] = 1000;
        energyTokenBalances[msg.sender] = 100;
    }

    function approveUser(address user) external onlyAdmin {
        approvedUsers[user] = true;
        if (energyCoinBalances[user] == 0) {
            energyCoinBalances[user] = 1000;
        }
        if (energyTokenBalances[user] == 0) {
            energyTokenBalances[user] = 100;
        }
        emit UserApproved(user);
    }

    function createListing(
        uint256 energyAmount,
        uint256 pricePerToken,
        string calldata energySource,
        string calldata location
    ) external onlyApproved returns (uint256) {
        require(energyAmount > 0, "Energy required");
        require(pricePerToken > 0, "Price required");
        require(energyTokenBalances[msg.sender] >= energyAmount, "Insufficient tokens");

        uint256 listingId = nextListingId++;
        listings[listingId] = Listing({
            id: listingId,
            producer: msg.sender,
            energyAmount: energyAmount,
            pricePerToken: pricePerToken,
            energySource: energySource,
            location: location,
            approved: false,
            active: true
        });

        emit ListingCreated(listingId, msg.sender);
        return listingId;
    }

    function approveListing(uint256 listingId) external onlyAdmin {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing inactive");
        listing.approved = true;
        emit ListingApproved(listingId);
    }

    function requestPurchase(uint256 listingId, uint256 amount)
        external
        onlyApproved
        returns (uint256)
    {
        Listing storage listing = listings[listingId];
        require(listing.active && listing.approved, "Listing unavailable");
        require(amount > 0 && amount <= listing.energyAmount, "Invalid amount");

        uint256 totalPrice = amount * listing.pricePerToken;
        require(energyCoinBalances[msg.sender] >= totalPrice, "Insufficient coins");

        uint256 requestId = nextRequestId++;
        purchaseRequests[requestId] = PurchaseRequest({
            id: requestId,
            listingId: listingId,
            buyer: msg.sender,
            seller: listing.producer,
            amount: amount,
            totalPrice: totalPrice,
            status: RequestStatus.PendingTransactionApproval
        });

        emit PurchaseRequested(requestId, listingId, msg.sender);
        return requestId;
    }

    function rejectPurchase(uint256 requestId) external onlyAdmin {
        PurchaseRequest storage request = purchaseRequests[requestId];
        require(request.status == RequestStatus.PendingTransactionApproval, "Not pending");
        request.status = RequestStatus.Rejected;
        emit PurchaseRejected(requestId);
    }

    function approvePurchase(uint256 requestId) external onlyAdmin returns (bytes32) {
        PurchaseRequest storage request = purchaseRequests[requestId];
        Listing storage listing = listings[request.listingId];
        require(request.status == RequestStatus.PendingTransactionApproval, "Not pending");
        require(listing.energyAmount >= request.amount, "Listing depleted");
        require(energyCoinBalances[request.buyer] >= request.totalPrice, "Buyer coins low");
        require(energyTokenBalances[request.seller] >= request.amount, "Seller tokens low");

        energyCoinBalances[request.buyer] -= request.totalPrice;
        energyCoinBalances[request.seller] += request.totalPrice;
        energyTokenBalances[request.seller] -= request.amount;
        energyTokenBalances[request.buyer] += request.amount;
        listing.energyAmount -= request.amount;
        request.status = RequestStatus.BlockchainConfirmed;

        bytes32 transactionHash = keccak256(
            abi.encodePacked(
                block.number,
                block.timestamp,
                requestId,
                request.buyer,
                request.seller,
                request.amount
            )
        );

        emit PurchaseConfirmed(requestId, transactionHash);
        return transactionHash;
    }
}
