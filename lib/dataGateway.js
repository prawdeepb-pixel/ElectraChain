import { createSeedDatabase, normalizeDatabase } from "./seedData";
import { loadLocalDatabase, resetLocalDatabase, saveLocalDatabase } from "./localDatabase";
import { shouldUseSupabase, supabase } from "./supabaseClient";

const TABLES = {
  users: "profiles",
  wallets: "wallets",
  listings: "energy_listings",
  purchaseRequests: "purchase_requests",
  transactions: "transactions",
  walletHistory: "wallet_history",
  supportRequests: "support_requests",
  blockchainLogs: "blockchain_logs",
  approvals: "approvals"
};

export async function loadDatabase() {
  if (!shouldUseSupabase()) {
    return {
      db: loadLocalDatabase(),
      mode: "localStorage"
    };
  }

  try {
    const [
      users,
      wallets,
      listings,
      purchaseRequests,
      transactions,
      walletHistory,
      supportRequests,
      blockchainLogs,
      approvals
    ] = await Promise.all([
      fetchTable(TABLES.users),
      fetchTable(TABLES.wallets),
      fetchTable(TABLES.listings),
      fetchTable(TABLES.purchaseRequests),
      fetchTable(TABLES.transactions),
      fetchTable(TABLES.walletHistory),
      fetchTable(TABLES.supportRequests),
      fetchTable(TABLES.blockchainLogs),
      fetchTable(TABLES.approvals)
    ]);

    const db = normalizeDatabase({
      users: users.map(fromProfileRow),
      wallets: wallets.map(fromWalletRow),
      listings: listings.map(fromListingRow),
      purchaseRequests: purchaseRequests.map(fromPurchaseRequestRow),
      transactions: transactions.map(fromTransactionRow),
      walletHistory: walletHistory.map(fromWalletHistoryRow),
      supportRequests: supportRequests.map(fromSupportRequestRow),
      blockchainLogs: blockchainLogs.map(fromBlockchainRow),
      approvals: approvals.map(fromApprovalRow)
    });

    if (!db.users.length) {
      const seed = createSeedDatabase();
      await persistDatabase(seed, "supabase");
      return { db: seed, mode: "supabase" };
    }

    saveLocalDatabase(db);
    return { db, mode: "supabase" };
  } catch (error) {
    return {
      db: loadLocalDatabase(),
      mode: "localStorage",
      warning: error instanceof Error ? error.message : "Supabase unavailable"
    };
  }
}

export async function persistDatabase(db, mode = "localStorage") {
  const normalized = normalizeDatabase(db);
  saveLocalDatabase(normalized);

  if (mode !== "supabase" || !shouldUseSupabase()) {
    return;
  }

  await Promise.all([
    upsertRows(TABLES.users, normalized.users.map(toProfileRow)),
    upsertRows(TABLES.wallets, normalized.wallets.map(toWalletRow)),
    upsertRows(TABLES.listings, normalized.listings.map(toListingRow)),
    upsertRows(
      TABLES.purchaseRequests,
      normalized.purchaseRequests.map(toPurchaseRequestRow)
    ),
    upsertRows(TABLES.transactions, normalized.transactions.map(toTransactionRow)),
    upsertRows(TABLES.walletHistory, normalized.walletHistory.map(toWalletHistoryRow)),
    upsertRows(TABLES.supportRequests, normalized.supportRequests.map(toSupportRequestRow)),
    upsertRows(TABLES.blockchainLogs, normalized.blockchainLogs.map(toBlockchainRow)),
    upsertRows(TABLES.approvals, normalized.approvals.map(toApprovalRow))
  ]);
}

export async function resetDatabase(mode = "localStorage") {
  const seed = resetLocalDatabase();
  if (mode === "supabase" && shouldUseSupabase()) {
    await persistDatabase(seed, mode);
  }
  return seed;
}

async function fetchTable(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    throw error;
  }
  return data || [];
}

async function upsertRows(table, rows) {
  if (!rows.length) {
    return;
  }

  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

function fromProfileRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    city: row.city || "",
    energyType: row.energy_type || "Solar",
    status: row.status,
    producerVerified: Boolean(row.producer_verified),
    consumerVerified: Boolean(row.consumer_verified),
    createdAt: row.created_at || "",
    approvedAt: row.approved_at || "",
    rejectedAt: row.rejected_at || "",
    suspendedAt: row.suspended_at || ""
  };
}

function toProfileRow(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    city: user.city || null,
    energy_type: user.energyType || null,
    status: user.status,
    producer_verified: Boolean(user.producerVerified),
    consumer_verified: Boolean(user.consumerVerified),
    created_at: user.createdAt || null,
    approved_at: user.approvedAt || null,
    rejected_at: user.rejectedAt || null,
    suspended_at: user.suspendedAt || null
  };
}

function fromWalletRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    walletAddress: row.wallet_address,
    confirmedBalance: Number(row.confirmed_balance || 0),
    pendingBalance: Number(row.pending_balance || 0),
    energyTokens: Number(row.energy_tokens || 0),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

function toWalletRow(wallet) {
  return {
    id: wallet.id,
    user_id: wallet.userId,
    wallet_address: wallet.walletAddress,
    confirmed_balance: wallet.confirmedBalance,
    pending_balance: wallet.pendingBalance,
    energy_tokens: wallet.energyTokens,
    created_at: wallet.createdAt || null,
    updated_at: wallet.updatedAt || null
  };
}

function fromListingRow(row) {
  return {
    id: row.id,
    producerId: row.producer_id,
    producerName: row.producer_name,
    amount: Number(row.amount || 0),
    remainingAmount: Number(row.remaining_amount || 0),
    pricePerToken: Number(row.price_per_token || 0),
    energySource: row.energy_source,
    location: row.location,
    description: row.description,
    status: row.status,
    createdAt: row.created_at || "",
    approvedAt: row.approved_at || "",
    rejectedAt: row.rejected_at || ""
  };
}

function toListingRow(listing) {
  return {
    id: listing.id,
    producer_id: listing.producerId,
    producer_name: listing.producerName,
    amount: listing.amount,
    remaining_amount: listing.remainingAmount,
    price_per_token: listing.pricePerToken,
    energy_source: listing.energySource,
    location: listing.location,
    description: listing.description,
    status: listing.status,
    created_at: listing.createdAt || null,
    approved_at: listing.approvedAt || null,
    rejected_at: listing.rejectedAt || null
  };
}

function fromPurchaseRequestRow(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amount: Number(row.amount || 0),
    pricePerToken: Number(row.price_per_token || 0),
    totalPrice: Number(row.total_price || 0),
    status: row.status,
    createdAt: row.created_at || "",
    approvedAt: row.approved_at || "",
    rejectedAt: row.rejected_at || "",
    blockchainHash: row.blockchain_hash || ""
  };
}

function toPurchaseRequestRow(request) {
  return {
    id: request.id,
    listing_id: request.listingId,
    buyer_id: request.buyerId,
    seller_id: request.sellerId,
    amount: request.amount,
    price_per_token: request.pricePerToken,
    total_price: request.totalPrice,
    status: request.status,
    created_at: request.createdAt || null,
    approved_at: request.approvedAt || null,
    rejected_at: request.rejectedAt || null,
    blockchain_hash: request.blockchainHash || null
  };
}

function fromTransactionRow(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amount: Number(row.amount || 0),
    pricePerToken: Number(row.price_per_token || 0),
    totalPrice: Number(row.total_price || 0),
    status: row.status,
    blockchainStatus: row.blockchain_status,
    hash: row.hash || "",
    blockNumber: Number(row.block_number || 0),
    timestamp: row.timestamp || ""
  };
}

function toTransactionRow(transaction) {
  return {
    id: transaction.id,
    request_id: transaction.requestId,
    listing_id: transaction.listingId,
    buyer_id: transaction.buyerId,
    seller_id: transaction.sellerId,
    amount: transaction.amount,
    price_per_token: transaction.pricePerToken,
    total_price: transaction.totalPrice,
    status: transaction.status,
    blockchain_status: transaction.blockchainStatus,
    hash: transaction.hash || null,
    block_number: transaction.blockNumber || null,
    timestamp: transaction.timestamp || null
  };
}

function fromWalletHistoryRow(row) {
  return {
    id: row.id,
    walletId: row.wallet_id,
    userId: row.user_id,
    confirmedBalance: Number(row.confirmed_balance || 0),
    pendingBalance: Number(row.pending_balance || 0),
    energyTokens: Number(row.energy_tokens || 0),
    deltaCoins: Number(row.delta_coins || 0),
    deltaTokens: Number(row.delta_tokens || 0),
    activity: row.activity,
    createdAt: row.created_at || ""
  };
}

function toWalletHistoryRow(entry) {
  return {
    id: entry.id,
    wallet_id: entry.walletId,
    user_id: entry.userId,
    confirmed_balance: entry.confirmedBalance,
    pending_balance: entry.pendingBalance,
    energy_tokens: entry.energyTokens,
    delta_coins: entry.deltaCoins,
    delta_tokens: entry.deltaTokens,
    activity: entry.activity,
    created_at: entry.createdAt || null
  };
}

function fromSupportRequestRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    adminReply: row.admin_reply || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

function toSupportRequestRow(request) {
  return {
    id: request.id,
    user_id: request.userId,
    user_name: request.userName,
    user_email: request.userEmail,
    category: request.category,
    subject: request.subject,
    message: request.message,
    status: request.status,
    admin_reply: request.adminReply || null,
    created_at: request.createdAt || null,
    updated_at: request.updatedAt || null
  };
}

function fromBlockchainRow(row) {
  return {
    id: row.id,
    blockNumber: Number(row.block_number || 0),
    transactionHash: row.transaction_hash,
    buyer: row.buyer,
    buyerEmail: row.buyer_email,
    seller: row.seller,
    sellerEmail: row.seller_email,
    amount: Number(row.amount || 0),
    totalPrice: Number(row.total_price || 0),
    status: row.status,
    timestamp: row.timestamp || ""
  };
}

function toBlockchainRow(log) {
  return {
    id: log.id,
    block_number: log.blockNumber,
    transaction_hash: log.transactionHash,
    buyer: log.buyer,
    buyer_email: log.buyerEmail,
    seller: log.seller,
    seller_email: log.sellerEmail,
    amount: log.amount,
    total_price: log.totalPrice,
    status: log.status,
    timestamp: log.timestamp || null
  };
}

function fromApprovalRow(row) {
  return {
    id: row.id,
    type: row.type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    action: row.action,
    status: row.status,
    note: row.note || "",
    createdAt: row.created_at || ""
  };
}

function toApprovalRow(approval) {
  return {
    id: approval.id,
    type: approval.type,
    entity_id: approval.entityId,
    actor_id: approval.actorId,
    actor_email: approval.actorEmail,
    action: approval.action,
    status: approval.status,
    note: approval.note || null,
    created_at: approval.createdAt || null
  };
}
