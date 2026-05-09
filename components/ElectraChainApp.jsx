"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  BadgeCheck,
  Ban,
  BarChart3,
  Blocks,
  Bolt,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  Copy,
  Crown,
  Database,
  Eye,
  Factory,
  Filter,
  Gauge,
  History,
  Home,
  Landmark,
  LifeBuoy,
  LineChart,
  Loader2,
  Lock,
  LogOut,
  MessageSquareText,
  Network,
  PlugZap,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  ShoppingCart,
  Send,
  Store,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
  XCircle
} from "lucide-react";
import {
  STATUS,
  createUser,
  createWallet,
  createWalletHistoryEntry,
  createSettlementHash,
  makeId,
  nextBlockNumber,
  normalizeDatabase,
  nowIso
} from "@/lib/seedData";
import { loadDatabase, persistDatabase, resetDatabase } from "@/lib/dataGateway";

const adminViews = [
  { key: "admin", label: "Energy Analytics", icon: BarChart3 },
  { key: "users", label: "User Governance", icon: ShieldCheck },
  { key: "admin-listings", label: "Energy Listings", icon: Store },
  { key: "admin-transactions", label: "Energy Settlements", icon: ArrowRightLeft },
  { key: "wallets", label: "Smart Wallets", icon: WalletCards },
  { key: "support", label: "Support Center", icon: LifeBuoy },
  { key: "logs", label: "Chain Explorer", icon: Blocks },
  { key: "blockchain", label: "Energy Blockchain Network", icon: Server },
  { key: "storage", label: "Data Management", icon: Database }
];

const energyUserViews = [
  { key: "overview", label: "Dashboard", icon: Home },
  { key: "wallet", label: "Wallet", icon: WalletCards },
  { key: "marketplace", label: "Marketplace", icon: Store },
  { key: "activity", label: "Activity", icon: History },
  { key: "help", label: "Help & Support", icon: LifeBuoy }
];

const energySources = ["Solar", "Wind", "Hydro", "Battery Storage"];
const restrictedEnergyUserViews = ["blockchain", "storage", "logs"];
const SUPPORT_CATEGORIES = [
  "Transaction problem",
  "Wallet balance issue",
  "Listing approval delay",
  "Purchase request issue",
  "Account approval issue",
  "Other"
];
const SUPPORT_STATUSES = ["Open", "In Review", "Replied", "Closed"];
const BASE_MARKET_VOLUME = 13889;
const MARKET_TICKER = [
  ["Solar Energy", "+4.0%", "up"],
  ["Wind Energy", "-2.0%", "down"],
  ["Hydro Energy", "+3.0%", "up"],
  ["EnergyCoin", "+1.8%", "up"],
  ["Battery Storage", "+1.2%", "up"],
  ["Grid Demand", "-0.6%", "down"]
];

function calculateMarketVolume(db) {
  return roundCurrency(
    BASE_MARKET_VOLUME +
      db.transactions.reduce(
        (sum, transaction) =>
          sum + Number(transaction.marketDelta ?? transaction.totalPrice ?? 0),
        0
      )
  );
}

function formatMarketNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function createMarketSeries(seed = 0) {
  const numericSeed = Number(seed) || 0;
  const offset = (numericSeed % 9) / 100;
  let current = 4.72 + offset;
  return Array.from({ length: 28 }).map((_, index) => {
    const wave = Math.sin(index * 0.72) * 0.07;
    const drift = index % 4 === 0 ? 0.05 : -0.015;
    const open = current;
    const close = Math.max(3.8, open + wave + drift);
    const high = Math.max(open, close) + 0.05 + (index % 3) * 0.015;
    const low = Math.min(open, close) - 0.045 - (index % 2) * 0.012;
    current = close;
    return {
      id: `market-${index}`,
      open: roundCurrency(open),
      close: roundCurrency(close),
      high: roundCurrency(high),
      low: roundCurrency(low)
    };
  });
}

function useAnimatedNumber(target) {
  const [displayValue, setDisplayValue] = useState(target);

  useEffect(() => {
    let frame = 0;
    const startValue = displayValue;
    const difference = target - startValue;
    const startedAt = performance.now();

    const tick = (timestamp) => {
      const progress = Math.min(1, (timestamp - startedAt) / 900);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + difference * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return displayValue;
}

function useLiveMarketSeries(seed) {
  const [series, setSeries] = useState(() => createMarketSeries(seed));

  useEffect(() => {
    setSeries(createMarketSeries(seed));
  }, [seed]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeries((current) => {
        const previous = current[current.length - 1] || {
          close: 4.8,
          high: 4.86,
          low: 4.73
        };
        const direction = Math.random() > 0.44 ? 1 : -1;
        const movement = direction * (0.025 + Math.random() * 0.08);
        const open = previous.close;
        const close = Math.max(3.6, open + movement);
        const high = Math.max(open, close) + Math.random() * 0.06;
        const low = Math.min(open, close) - Math.random() * 0.06;
        return [
          ...current.slice(1),
          {
            id: `market-${Date.now()}`,
            open: roundCurrency(open),
            close: roundCurrency(close),
            high: roundCurrency(high),
            low: roundCurrency(low)
          }
        ];
      });
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  return series;
}

export default function ElectraChainApp({ initialView = "overview" }) {
  const [db, setDb] = useState(null);
  const [session, setSession] = useState(null);
  const [dataMode, setDataMode] = useState("localStorage");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [activeView, setActiveView] = useState(initialView);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    city: "",
    energyType: "Solar",
    role: "Energy User"
  });
  const [userQuery, setUserQuery] = useState("");
  const [userFilter, setUserFilter] = useState("All");
  const [listingFilter, setListingFilter] = useState("All");
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [supportFilter, setSupportFilter] = useState("All");
  const [supportReplies, setSupportReplies] = useState({});
  const [marketQuery, setMarketQuery] = useState("");
  const [tradeMode, setTradeMode] = useState("producer");
  const [purchaseAmounts, setPurchaseAmounts] = useState({});
  const [walletConnected, setWalletConnected] = useState(false);
  const [miningRequestId, setMiningRequestId] = useState("");
  const [listingForm, setListingForm] = useState({
    amount: "25",
    pricePerToken: "4.5",
    energySource: "Solar",
    location: "",
    description: ""
  });
  const [supportForm, setSupportForm] = useState({
    category: SUPPORT_CATEGORIES[0],
    subject: "",
    message: ""
  });

  useEffect(() => {
    let mounted = true;
    loadDatabase().then((result) => {
      if (!mounted) {
        return;
      }
      setDb(normalizeDatabase(result.db));
      setDataMode(result.mode);
      if (result.warning) {
        setWarning(`Supabase fallback active: ${result.warning}`);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const currentUser = useMemo(
    () => db?.users.find((user) => user.id === session?.userId) || null,
    [db, session]
  );

  const currentWallet = useMemo(
    () => db?.wallets.find((wallet) => wallet.userId === currentUser?.id) || null,
    [db, currentUser]
  );

  const analytics = useMemo(() => {
    if (!db) {
      return null;
    }

    const countUsers = (predicate) => db.users.filter(predicate).length;
    const countListings = (status) =>
      db.listings.filter((listing) => listing.status === status).length;
    const countRequests = (status) =>
      db.purchaseRequests.filter((request) => request.status === status).length;
    const totalEnergyTraded = db.transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    );
    const totalPlatformValue = db.transactions.reduce(
      (sum, transaction) => sum + Number(transaction.totalPrice || 0),
      0
    );

    return {
      pendingUsers: countUsers((user) => user.status === STATUS.PENDING_APPROVAL),
      approvedUsers: countUsers((user) => user.status === STATUS.APPROVED),
      rejectedUsers: countUsers((user) => user.status === STATUS.REJECTED),
      suspendedUsers: countUsers((user) => user.status === STATUS.SUSPENDED),
      pendingListings: countListings(STATUS.PENDING_LISTING),
      approvedListings: countListings(STATUS.APPROVED),
      pendingTransactions: countRequests(STATUS.PENDING_TRANSACTION),
      approvedTransactions: db.transactions.filter(
        (transaction) => transaction.status === STATUS.APPROVED
      ).length,
      totalEnergyTraded,
      totalPlatformValue,
      totalProducers: countUsers((user) => user.producerVerified),
      totalConsumers: countUsers((user) => user.consumerVerified),
      totalEnergyUsers: countUsers((user) => user.role === "Energy User"),
      totalAdmins: countUsers((user) => user.role === "Admin"),
      openSupportRequests: db.supportRequests.filter(
        (request) => request.status === "Open" || request.status === "In Review"
      ).length
    };
  }, [db]);

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  function commit(mutator, message) {
    setDb((current) => {
      if (!current) {
        return current;
      }
      const draft = JSON.parse(JSON.stringify(current));
      mutator(draft);
      const normalized = normalizeDatabase(draft);
      persistDatabase(normalized, dataMode).catch((error) => {
        setWarning(
          error instanceof Error
            ? `Persistence warning: ${error.message}`
            : "Persistence warning"
        );
      });
      return normalized;
    });

    if (message) {
      flash(message);
    }
  }

  function addApproval(draft, type, entityId, action, status, note = "") {
    draft.approvals.unshift({
      id: makeId("approval"),
      type,
      entityId,
      actorId: currentUser?.id || "system",
      actorEmail: currentUser?.email || "system@electrachain.local",
      action,
      status,
      note,
      createdAt: nowIso()
    });
  }

  function ensureWallet(draft, user) {
    const exists = draft.wallets.some((wallet) => wallet.userId === user.id);
    if (!exists) {
      const wallet = createWallet(user);
      draft.wallets.push(wallet);
      draft.walletHistory.unshift(
        createWalletHistoryEntry(wallet, "Admin approved wallet allocation")
      );
    }
  }

  function startSession(user) {
    setSession({ userId: user.id });
    setWalletConnected(false);
    if (user.role === "Admin") {
      const adminTarget = adminViews.some((view) => view.key === initialView)
        ? initialView
        : "admin";
      setActiveView(adminTarget);
    } else {
      setActiveView(
        restrictedEnergyUserViews.includes(initialView) ? initialView : "overview"
      );
    }
    if (user.status === STATUS.APPROVED) {
      flash(`${user.role} session active.`);
    } else {
      flash(`Account status: ${user.status}.`);
    }
  }

  function handleLogin(event) {
    event.preventDefault();
    const email = loginForm.email.trim().toLowerCase();
    const user = db?.users.find(
      (candidate) =>
        candidate.email === email && candidate.password === loginForm.password
    );

    if (!user) {
      flash("Invalid email or password.");
      return;
    }

    startSession(user);
  }

  function handleRegister(event) {
    event.preventDefault();
    const name = registerForm.name.trim();
    const email = registerForm.email.trim().toLowerCase();
    const password = registerForm.password;
    const city = registerForm.city.trim();

    if (!name || !email || !password || !city) {
      flash("Name, email, password, and city are required.");
      return;
    }

    if (db.users.some((user) => user.email === email)) {
      flash("That email is already registered.");
      return;
    }

    const user = createUser({
      name,
      email,
      password,
      role: "Energy User",
      city,
      energyType: registerForm.energyType
    });

    commit((draft) => {
      draft.users.unshift(user);
      const wallet = createWallet(user);
      draft.wallets.unshift(wallet);
      draft.walletHistory.unshift(
        createWalletHistoryEntry(wallet, "Wallet address generated at registration")
      );
      addApproval(
        draft,
        "User",
        user.id,
        "Energy User registration submitted",
        STATUS.PENDING_APPROVAL,
        "Awaiting Admin Governance approval"
      );
    }, "Registration submitted. Waiting for ElectraChain Authority approval.");

    setSession({ userId: user.id });
    setActiveView("overview");
    setRegisterForm({
      name: "",
      email: "",
      password: "",
      city: "",
      energyType: "Solar",
      role: "Energy User"
    });
  }

  function logout() {
    setSession(null);
    setWalletConnected(false);
    setActiveView(initialView);
  }

  function approveUser(userId) {
    commit((draft) => {
      const user = draft.users.find((candidate) => candidate.id === userId);
      if (!user) {
        return;
      }
      user.status = STATUS.APPROVED;
      user.approvedAt = nowIso();
      user.rejectedAt = "";
      user.suspendedAt = "";
      ensureWallet(draft, user);
      addApproval(
        draft,
        "User",
        user.id,
        `Approved ${user.email}`,
        STATUS.APPROVED,
        "Wallet issued with 1000 EnergyCoins and 100 Energy Tokens"
      );
    }, "User approved and wallet issued.");
  }

  function rejectUser(userId) {
    commit((draft) => {
      const user = draft.users.find((candidate) => candidate.id === userId);
      if (!user) {
        return;
      }
      user.status = STATUS.REJECTED;
      user.rejectedAt = nowIso();
      addApproval(draft, "User", user.id, `Rejected ${user.email}`, STATUS.REJECTED);
    }, "User rejected.");
  }

  function suspendUser(userId) {
    commit((draft) => {
      const user = draft.users.find((candidate) => candidate.id === userId);
      if (!user) {
        return;
      }
      user.status = STATUS.SUSPENDED;
      user.suspendedAt = nowIso();
      addApproval(
        draft,
        "User",
        user.id,
        `Suspended ${user.email}`,
        STATUS.SUSPENDED,
        "Platform access deactivated"
      );
    }, "User suspended.");
  }

  function verifyUser(userId, type) {
    commit((draft) => {
      const user = draft.users.find((candidate) => candidate.id === userId);
      if (!user) {
        return;
      }
      if (type === "Producer") {
        user.producerVerified = true;
      }
      if (type === "Consumer") {
        user.consumerVerified = true;
      }
      addApproval(
        draft,
        "User",
        user.id,
        `Marked ${type} activity for ${user.email}`,
        type
      );
    }, `${type} activity badge updated.`);
  }

  function promoteToAdmin(userId) {
    commit((draft) => {
      const user = draft.users.find((candidate) => candidate.id === userId);
      if (!user) {
        return;
      }
      user.role = "Admin";
      user.status = STATUS.APPROVED;
      user.approvedAt = user.approvedAt || nowIso();
      ensureWallet(draft, user);
      addApproval(
        draft,
        "User",
        user.id,
        `Promoted ${user.email} to Admin`,
        STATUS.APPROVED
      );
    }, "Approved user promoted to Admin.");
  }

  function submitListing(event) {
    event.preventDefault();
    if (!currentUser || currentUser.role === "Admin") {
      flash("Approved Energy Users can create energy listings.");
      return;
    }

    const amount = Number(listingForm.amount);
    const pricePerToken = Number(listingForm.pricePerToken);
    if (!amount || amount <= 0 || !pricePerToken || pricePerToken <= 0) {
      flash("Energy amount and price must be positive numbers.");
      return;
    }

    if (currentWallet && amount > currentWallet.energyTokens) {
      flash("Listing amount cannot exceed your current energy token balance.");
      return;
    }

    const listing = {
      id: makeId("listing"),
      producerId: currentUser.id,
      producerName: currentUser.name,
      amount,
      remainingAmount: amount,
      pricePerToken,
      energySource: listingForm.energySource,
      location: listingForm.location.trim() || "Smart City District",
      description:
        listingForm.description.trim() || "Energy listing awaiting approval.",
      status: STATUS.PENDING_LISTING,
      createdAt: nowIso(),
      approvedAt: "",
      rejectedAt: ""
    };

    commit((draft) => {
      draft.listings.unshift(listing);
      const user = draft.users.find((candidate) => candidate.id === currentUser.id);
      if (user) {
        user.producerVerified = true;
      }
      addApproval(
        draft,
        "Listing",
        listing.id,
        "Energy listing submitted",
        STATUS.PENDING_LISTING,
        `${amount} tokens from ${listing.energySource}`
      );
    }, "Sell energy listing submitted for Admin approval.");

    setListingForm({
      amount: "25",
      pricePerToken: "4.5",
      energySource: "Solar",
      location: "",
      description: ""
    });
  }

  function approveListing(listingId) {
    commit((draft) => {
      const listing = draft.listings.find((candidate) => candidate.id === listingId);
      if (!listing) {
        return;
      }
      listing.status = STATUS.APPROVED;
      listing.approvedAt = nowIso();
      listing.rejectedAt = "";
      addApproval(
        draft,
        "Listing",
        listing.id,
        `Approved listing ${listing.id}`,
        STATUS.APPROVED
      );
    }, "Listing approved for the marketplace.");
  }

  function rejectListing(listingId) {
    commit((draft) => {
      const listing = draft.listings.find((candidate) => candidate.id === listingId);
      if (!listing) {
        return;
      }
      listing.status = STATUS.REJECTED;
      listing.rejectedAt = nowIso();
      addApproval(
        draft,
        "Listing",
        listing.id,
        `Rejected listing ${listing.id}`,
        STATUS.REJECTED
      );
    }, "Listing rejected.");
  }

  function requestPurchase(listing) {
    if (!currentUser || currentUser.role === "Admin") {
      flash("Approved Energy Users can request energy purchases.");
      return;
    }

    if (!currentWallet) {
      flash("Wallet is not available for this account.");
      return;
    }

    if (listing.producerId === currentUser.id) {
      flash("Choose another user's approved listing to buy energy.");
      return;
    }

    const amount = Number(purchaseAmounts[listing.id] || 1);
    const totalPrice = roundCurrency(amount * Number(listing.pricePerToken));
    const pendingOutgoing = db.purchaseRequests
      .filter(
        (request) =>
          request.buyerId === currentUser.id &&
          [STATUS.PENDING_TRANSACTION, STATUS.MINING].includes(request.status)
      )
      .reduce((sum, request) => sum + Number(request.totalPrice || 0), 0);
    const availableCoins =
      Number(currentWallet.confirmedBalance || 0) - pendingOutgoing;

    if (!amount || amount <= 0) {
      flash("Enter a valid token amount.");
      return;
    }
    if (amount > Number(listing.remainingAmount || 0)) {
      flash("Purchase amount exceeds the approved listing balance.");
      return;
    }
    if (totalPrice > availableCoins) {
      flash("Insufficient available EnergyCoins for this pending request.");
      return;
    }

    const request = {
      id: makeId("request"),
      listingId: listing.id,
      buyerId: currentUser.id,
      sellerId: listing.producerId,
      amount,
      pricePerToken: Number(listing.pricePerToken),
      totalPrice,
      status: STATUS.PENDING_TRANSACTION,
      createdAt: nowIso(),
      approvedAt: "",
      rejectedAt: "",
      blockchainHash: ""
    };

    commit((draft) => {
      draft.purchaseRequests.unshift(request);
      const buyer = draft.users.find((user) => user.id === currentUser.id);
      if (buyer) {
        buyer.consumerVerified = true;
      }
      addApproval(
        draft,
        "Transaction",
        request.id,
        "Purchase request submitted",
        STATUS.PENDING_TRANSACTION,
        `${amount} tokens from ${listing.producerName}`
      );
    }, "Purchase request sent to Admin Governance.");

    setPurchaseAmounts((current) => ({ ...current, [listing.id]: "1" }));
  }

  function approveTransaction(requestId) {
    setMiningRequestId(requestId);
    commit((draft) => {
      const request = draft.purchaseRequests.find(
        (candidate) => candidate.id === requestId
      );
      if (!request || request.status !== STATUS.PENDING_TRANSACTION) {
        return;
      }
      request.status = STATUS.MINING;
      addApproval(
        draft,
        "Transaction",
        request.id,
        "Transaction sent to mining queue",
        STATUS.MINING
      );
    }, "Mining transaction approval...");

    window.setTimeout(() => {
      commit((draft) => {
        const request = draft.purchaseRequests.find(
          (candidate) => candidate.id === requestId
        );
        if (!request || request.status !== STATUS.MINING) {
          return;
        }

        const listing = draft.listings.find(
          (candidate) => candidate.id === request.listingId
        );
        const buyer = draft.users.find((candidate) => candidate.id === request.buyerId);
        const seller = draft.users.find(
          (candidate) => candidate.id === request.sellerId
        );
        const buyerWallet = draft.wallets.find(
          (wallet) => wallet.userId === request.buyerId
        );
        const sellerWallet = draft.wallets.find(
          (wallet) => wallet.userId === request.sellerId
        );

        if (!listing || !buyer || !seller || !buyerWallet || !sellerWallet) {
          request.status = STATUS.REJECTED;
          request.rejectedAt = nowIso();
          addApproval(
            draft,
            "Transaction",
            request.id,
            "Transaction rejected due to missing linked records",
            STATUS.REJECTED
          );
          return;
        }

        const hash = createSettlementHash();
        const blockNumber = nextBlockNumber(draft);
        const timestamp = nowIso();
        const totalPrice = Number(request.totalPrice || 0);
        const amount = Number(request.amount || 0);

        buyerWallet.pendingBalance = roundCurrency(
          Math.max(0, Number(buyerWallet.pendingBalance || 0) - totalPrice)
        );
        sellerWallet.pendingBalance = roundCurrency(
          Math.max(0, Number(sellerWallet.pendingBalance || 0) - totalPrice)
        );
        buyerWallet.confirmedBalance = roundCurrency(
          Number(buyerWallet.confirmedBalance || 0) - totalPrice
        );
        sellerWallet.confirmedBalance = roundCurrency(
          Number(sellerWallet.confirmedBalance || 0) + totalPrice
        );
        buyerWallet.energyTokens = roundCurrency(
          Number(buyerWallet.energyTokens || 0) + amount
        );
        sellerWallet.energyTokens = roundCurrency(
          Math.max(0, Number(sellerWallet.energyTokens || 0) - amount)
        );
        buyerWallet.updatedAt = timestamp;
        sellerWallet.updatedAt = timestamp;
        draft.walletHistory.unshift({
          ...createWalletHistoryEntry(
            buyerWallet,
            "Blockchain confirmed buy settlement"
          ),
          deltaCoins: -totalPrice,
          deltaTokens: amount,
          createdAt: timestamp
        });
        draft.walletHistory.unshift({
          ...createWalletHistoryEntry(
            sellerWallet,
            "Blockchain confirmed sell settlement"
          ),
          deltaCoins: totalPrice,
          deltaTokens: -amount,
          createdAt: timestamp
        });
        buyer.consumerVerified = true;
        seller.producerVerified = true;

        listing.remainingAmount = roundCurrency(
          Math.max(0, Number(listing.remainingAmount || 0) - amount)
        );
        if (listing.remainingAmount <= 0) {
          listing.status = STATUS.SOLD;
        }
        request.status = STATUS.BLOCKCHAIN_CONFIRMED;
        request.approvedAt = timestamp;
        request.blockchainHash = hash;

        const transaction = {
          id: makeId("tx"),
          requestId: request.id,
          listingId: request.listingId,
          buyerId: request.buyerId,
          sellerId: request.sellerId,
          amount,
          pricePerToken: Number(request.pricePerToken || 0),
          totalPrice,
          status: STATUS.APPROVED,
          blockchainStatus: STATUS.BLOCKCHAIN_CONFIRMED,
          hash,
          blockNumber,
          timestamp
        };

        draft.transactions.unshift(transaction);
        draft.blockchainLogs.unshift({
          id: makeId("block"),
          blockNumber,
          transactionHash: hash,
          buyer: buyer.name,
          buyerEmail: buyer.email,
          seller: seller.name,
          sellerEmail: seller.email,
          amount,
          totalPrice,
          status: STATUS.BLOCKCHAIN_CONFIRMED,
          timestamp
        });

        addApproval(
          draft,
          "Transaction",
          request.id,
          "Transaction approved and blockchain confirmed",
          STATUS.BLOCKCHAIN_CONFIRMED,
          hash
        );
      }, "Transaction approved and blockchain hash confirmed.");
      setMiningRequestId("");
    }, 1400);
  }

  function rejectTransaction(requestId) {
    commit((draft) => {
      const request = draft.purchaseRequests.find(
        (candidate) => candidate.id === requestId
      );
      if (!request) {
        return;
      }
      request.status = STATUS.REJECTED;
      request.rejectedAt = nowIso();
      addApproval(
        draft,
        "Transaction",
        request.id,
        "Transaction rejected by Admin Governance",
        STATUS.REJECTED
      );
    }, "Transaction request rejected.");
  }

  function submitSupportRequest(event) {
    event.preventDefault();
    if (!currentUser || currentUser.role === "Admin") {
      flash("Energy Users can submit support requests from Help & Support.");
      return;
    }

    const subject = supportForm.subject.trim();
    const message = supportForm.message.trim();
    if (!subject || !message) {
      flash("Please add a subject and message before submitting.");
      return;
    }

    const timestamp = nowIso();
    const request = {
      id: makeId("support"),
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      category: supportForm.category,
      subject,
      message,
      status: "Open",
      adminReply: "",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    commit((draft) => {
      draft.supportRequests = draft.supportRequests || [];
      draft.supportRequests.unshift(request);
    }, "Your query has been received by ElectraChain Admin. Our team will respond shortly.");

    setSupportForm({
      category: SUPPORT_CATEGORIES[0],
      subject: "",
      message: ""
    });
  }

  function updateSupportStatus(requestId, status) {
    commit((draft) => {
      const request = draft.supportRequests.find(
        (candidate) => candidate.id === requestId
      );
      if (!request) {
        return;
      }
      request.status = status;
      request.updatedAt = nowIso();
    }, `Support request marked ${status}.`);
  }

  function replyToSupportRequest(requestId) {
    const reply = String(supportReplies[requestId] || "").trim();
    if (!reply) {
      flash("Write a short Admin reply before marking this request as replied.");
      return;
    }

    commit((draft) => {
      const request = draft.supportRequests.find(
        (candidate) => candidate.id === requestId
      );
      if (!request) {
        return;
      }
      request.adminReply = reply;
      request.status = "Replied";
      request.updatedAt = nowIso();
    }, "Admin reply saved for the user.");
  }

  async function resetAuthorityData() {
    const seed = await resetDatabase(dataMode);
    setDb(seed);
    setSession(null);
    setActiveView(initialView);
    flash("Authority data store reset.");
  }

  if (!db) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return (
      <AuthShell
        db={db}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        notice={notice}
        warning={warning}
        dataMode={dataMode}
      />
    );
  }

  if (currentUser.status !== STATUS.APPROVED) {
    return (
      <StatusGate
        user={currentUser}
        notice={notice}
        warning={warning}
        logout={logout}
        dataMode={dataMode}
      />
    );
  }

  const navItems =
    currentUser.role === "Admin"
      ? adminViews
      : energyUserViews;

  return (
    <div className="min-h-screen">
      <TopBar
        user={currentUser}
        dataMode={dataMode}
        walletConnected={walletConnected}
        onConnectWallet={() => {
          setWalletConnected(true);
          flash("Wallet interface connected.");
        }}
        logout={logout}
      />

      <div className="mx-auto grid w-full max-w-[1480px] gap-5 px-4 pb-10 pt-4 lg:grid-cols-[260px_1fr] lg:px-6">
        <Sidebar
          items={navItems}
          activeView={activeView}
          setActiveView={setActiveView}
          user={currentUser}
        />

        <main className="min-w-0 space-y-5">
          {notice ? <Alert tone="success">{notice}</Alert> : null}
          {warning ? <Alert tone="warning">{warning}</Alert> : null}
          {renderView()}
        </main>
      </div>
    </div>
  );

  function renderView() {
    if (currentUser.role === "Admin") {
      if (activeView === "users") {
        return (
          <AdminUsers
            db={db}
            userQuery={userQuery}
            setUserQuery={setUserQuery}
            userFilter={userFilter}
            setUserFilter={setUserFilter}
            approveUser={approveUser}
            rejectUser={rejectUser}
            suspendUser={suspendUser}
            verifyUser={verifyUser}
            promoteToAdmin={promoteToAdmin}
          />
        );
      }
      if (activeView === "admin-listings") {
        return (
          <AdminListings
            db={db}
            listingFilter={listingFilter}
            setListingFilter={setListingFilter}
            approveListing={approveListing}
            rejectListing={rejectListing}
          />
        );
      }
      if (activeView === "admin-transactions") {
        return (
          <AdminTransactions
            db={db}
            transactionFilter={transactionFilter}
            setTransactionFilter={setTransactionFilter}
            approveTransaction={approveTransaction}
            rejectTransaction={rejectTransaction}
            miningRequestId={miningRequestId}
          />
        );
      }
      if (activeView === "wallets") {
        return <WalletRegistry db={db} />;
      }
      if (activeView === "support") {
        return (
          <AdminSupportCenter
            db={db}
            supportFilter={supportFilter}
            setSupportFilter={setSupportFilter}
            supportReplies={supportReplies}
            setSupportReplies={setSupportReplies}
            updateSupportStatus={updateSupportStatus}
            replyToSupportRequest={replyToSupportRequest}
          />
        );
      }
      if (activeView === "logs") {
        return <BlockchainExplorer db={db} />;
      }
      if (activeView === "blockchain") {
        return (
          <BlockchainNetwork
            db={db}
            miningRequestId={miningRequestId}
            walletConnected={walletConnected}
            setWalletConnected={setWalletConnected}
          />
        );
      }
      if (activeView === "storage") {
        return <StorageViewer db={db} onReset={resetAuthorityData} />;
      }
      return (
        <AdminAnalytics
          analytics={analytics}
          db={db}
          approveUser={approveUser}
          approveListing={approveListing}
          approveTransaction={approveTransaction}
          promoteToAdmin={promoteToAdmin}
          miningRequestId={miningRequestId}
        />
      );
    }

    if (activeView === "wallet") {
      return (
        <WalletPanel
          user={currentUser}
          wallet={currentWallet}
          db={db}
          walletHistory={db.walletHistory}
          walletConnected={walletConnected}
          setWalletConnected={setWalletConnected}
        />
      );
    }
    if (activeView === "marketplace") {
      return (
        <Marketplace
          db={db}
          currentUser={currentUser}
          tradeMode={tradeMode}
          setTradeMode={setTradeMode}
          listingForm={listingForm}
          setListingForm={setListingForm}
          submitListing={submitListing}
          marketQuery={marketQuery}
          setMarketQuery={setMarketQuery}
          purchaseAmounts={purchaseAmounts}
          setPurchaseAmounts={setPurchaseAmounts}
          requestPurchase={requestPurchase}
        />
      );
    }
    if (activeView === "activity") {
      return <UserActivity db={db} currentUser={currentUser} />;
    }
    if (activeView === "help") {
      return (
        <HelpSupport
          db={db}
          user={currentUser}
          supportForm={supportForm}
          setSupportForm={setSupportForm}
          submitSupportRequest={submitSupportRequest}
        />
      );
    }
    if (restrictedEnergyUserViews.includes(activeView)) {
      return <AccessRestricted />;
    }

    return (
      <UserOverview
        db={db}
        user={currentUser}
        wallet={currentWallet}
        walletConnected={walletConnected}
        setWalletConnected={setWalletConnected}
      />
    );
  }
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass flex items-center gap-3 rounded-lg px-5 py-4 text-sm text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-mint" />
        Loading ElectraChain local governance database...
      </div>
    </div>
  );
}

function AuthShell({
  db,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  handleLogin,
  handleRegister,
  notice,
  warning,
  dataMode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="city-grid pointer-events-none absolute inset-0 opacity-70" />
      <PublicNavbar />

      <main className="relative mx-auto w-full max-w-7xl space-y-8 px-4 pb-12 pt-5 lg:px-6">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {warning ? <Alert tone="warning">{warning}</Alert> : null}

        <section id="home" className="glass overflow-hidden rounded-lg p-6 md:p-8">
          <div className="grid items-center gap-8 xl:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-mint">
                ELECTRACHAIN AUTHORITY
              </p>
            <h1 className="mt-3 text-4xl font-bold text-white md:text-6xl">
              Smart City Energy Trading
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
                Secure peer-to-peer renewable energy trading with blockchain
                settlement and smart-grid governance.
            </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <SignalCard icon={ArrowRightLeft} label="Marketplace" value="Buy and sell approved energy" />
                <SignalCard icon={ShieldCheck} label="Authority" value="Governed approvals" />
                <SignalCard icon={Blocks} label="Blockchain" value="Verified settlement trail" />
              </div>
            </div>
            <SmartCityGraphic />
          </div>
        </section>

        <section id="features" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            icon={ArrowRightLeft}
            title="Peer-to-Peer Energy Trading"
            text="Users can buy and sell renewable energy directly."
          />
          <InfoCard
            icon={Blocks}
            title="Blockchain Verification"
            text="Approved transactions generate blockchain hashes."
          />
          <InfoCard
            icon={Crown}
            title="Admin Approval System"
            text="All users and transactions require authority approval."
          />
          <InfoCard
            icon={WalletCards}
            title="Smart Wallet"
            text="Track energy token balance and wallet activity."
          />
          <InfoCard
            icon={Store}
            title="Energy Marketplace"
            text="View approved energy listings from users."
          />
          <InfoCard
            icon={TrendingUp}
            title="Live Market Activity"
            text="Watch live market updates and trading activity."
          />
        </section>

        <LiveMarketSection db={db} />

        <section id="access" className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint shadow-glow">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-mint">
                  Register New User
                </p>
                <h2 className="text-2xl font-bold text-white">
                  Apply for platform access
                </h2>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleRegister}>
              <Field
                label="Full Name"
                onChange={(value) =>
                  setRegisterForm((current) => ({ ...current, name: value }))
                }
                value={registerForm.name}
              />
              <Field
                label="Email"
                onChange={(value) =>
                  setRegisterForm((current) => ({ ...current, email: value }))
                }
                type="email"
                value={registerForm.email}
              />
              <Field
                label="Password"
                onChange={(value) =>
                  setRegisterForm((current) => ({ ...current, password: value }))
                }
                type="password"
                value={registerForm.password}
              />
              <Field
                label="City"
                onChange={(value) =>
                  setRegisterForm((current) => ({ ...current, city: value }))
                }
                value={registerForm.city}
              />
              <label className="block text-sm text-slate-200">
                Energy Type
                <select
                  className="mt-2 w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-white"
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      energyType: event.target.value
                    }))
                  }
                  value={registerForm.energyType}
                >
                  {energySources.map((source) => (
                    <option key={source}>{source}</option>
                  ))}
                </select>
              </label>
              <PrimaryButton icon={UserPlus} type="submit">
                Submit Registration
              </PrimaryButton>
            </form>
          </Panel>

          <Panel>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-cyan">
                  Approved User Login
                </p>
                <h2 className="text-2xl font-bold text-white">
                  Secure platform access
                </h2>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleLogin}>
              <Field
                label="Email"
                onChange={(value) =>
                  setLoginForm((current) => ({ ...current, email: value }))
                }
                type="email"
                value={loginForm.email}
              />
              <Field
                label="Password"
                onChange={(value) =>
                  setLoginForm((current) => ({ ...current, password: value }))
                }
                type="password"
                value={loginForm.password}
              />
              <PrimaryButton icon={Lock} type="submit">
                Login
              </PrimaryButton>
            </form>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Governance notice
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Pending users cannot access marketplace, wallet, buy energy, or
                sell energy until approved by ElectraChain Authority.
              </p>
              <p className="mt-3 text-xs text-cyan">Storage mode: {dataMode}</p>
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function PublicNavbar() {
  return (
    <header className="relative z-20 border-b border-white/10 bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
        <a className="flex items-center gap-3" href="#home">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint shadow-glow">
            <Bolt className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-mint">ElectraChain</p>
            <p className="text-sm font-bold text-white">Energy Trading Platform</p>
          </div>
        </a>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-300">
          <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="#home">Home</a>
          <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="#features">Features</a>
          <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="#market">Live Market</a>
          <a className="rounded-md bg-mint px-3 py-2 text-ink shadow-glow" href="#access">Register / Login</a>
        </nav>
      </div>
    </header>
  );
}

function LiveMarketSection({ db }) {
  const marketVolume = calculateMarketVolume(db);
  const animatedVolume = useAnimatedNumber(marketVolume);
  const marketSeries = useLiveMarketSeries(db.transactions.length);
  const activeListings = db.listings.filter(
    (listing) =>
      listing.status === STATUS.APPROVED && Number(listing.remainingAmount || 0) > 0
  ).length;
  const totalEnergy = db.transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  );
  const tradingActivity = createMarketActivityRows(db);

  return (
    <section id="market" className="glass overflow-hidden rounded-lg p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-mint">Live Market</p>
          <h2 className="text-2xl font-bold text-white">Energy Trading Exchange</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-mint/25 bg-mint/10 px-3 py-2 text-xs font-semibold text-mint">
          <span className="online-dot" />
          Market Online
        </span>
      </div>

      <MarketTicker />

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <MarketStatCard
          icon={CircleDollarSign}
          label="Market Volume"
          pulse
          tone="green"
          value={`${formatMarketNumber(animatedVolume)} EC`}
        />
        <MarketStatCard
          icon={Activity}
          label="Trading Activity"
          tone="cyan"
          value={`${db.transactions.length + 24} trades`}
        />
        <MarketStatCard
          icon={Store}
          label="Active Listings"
          tone="green"
          value={activeListings}
        />
        <MarketStatCard
          icon={Bolt}
          label="Energy Traded"
          tone="cyan"
          value={`${formatMarketNumber(totalEnergy)} kWh`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <LiveTradingChart
          marketVolume={animatedVolume}
          series={marketSeries}
          title="EnergyCoin Market Index"
        />
        <MarketActivityPanel rows={tradingActivity} />
      </div>
    </section>
  );
}

function MarketTicker() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="market-ticker flex min-w-max gap-3">
        {[...MARKET_TICKER, ...MARKET_TICKER].map(([name, value, trend], index) => (
          <span
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              trend === "up"
                ? "border-mint/25 bg-mint/10 text-mint"
                : "border-rose-300/25 bg-rose-300/10 text-rose-200"
            }`}
            key={`${name}-${index}`}
          >
            {name} {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function createMarketActivityRows(db) {
  const settlementRows = db.transactions.slice(0, 3).map((transaction) => ({
    id: transaction.id,
    label: "Energy sale executed",
    detail: `${transaction.amount} kWh cleared at ${Number(transaction.pricePerToken || 0).toFixed(2)} EC/kWh`,
    trend: "up",
    value: `+${formatMarketNumber(transaction.totalPrice)} EC`
  }));
  const baselineRows = [
    {
      id: "market-solar-depth",
      label: "Solar order book tightening",
      detail: "Urban microgrid bids increased near evening demand.",
      trend: "up",
      value: "+4.0%"
    },
    {
      id: "market-wind-depth",
      label: "Wind supply repriced",
      detail: "Short-term offers moved lower as capacity expanded.",
      trend: "down",
      value: "-2.0%"
    },
    {
      id: "market-hydro-depth",
      label: "Hydro contracts active",
      detail: "Stable capacity cleared across district demand zones.",
      trend: "up",
      value: "+3.0%"
    },
    {
      id: "market-coin-depth",
      label: "EnergyCoin liquidity rising",
      detail: "Tokenized settlement volume is trending upward.",
      trend: "up",
      value: "+1.8%"
    }
  ];

  return [...settlementRows, ...baselineRows].slice(0, 5);
}

function MarketActivityPanel({ rows }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Trading Activity</h3>
          <p className="mt-1 text-xs text-slate-400">
            Public market feed with price and volume movement.
          </p>
        </div>
        <span className="market-pulse-dot" />
      </div>
      <div className="space-y-3">
        {rows.map((activity) => (
          <div
            className="rounded-lg border border-white/10 bg-ink/35 px-3 py-3"
            key={activity.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{activity.label}</p>
              <span
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                  activity.trend === "up"
                    ? "border-mint/25 bg-mint/10 text-mint"
                    : "border-rose-300/25 bg-rose-300/10 text-rose-200"
                }`}
              >
                {activity.value}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{activity.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniBalance label="Solar" value="+4.0%" />
        <MiniBalance label="Wind" value="-2.0%" />
        <MiniBalance label="Hydro" value="+3.0%" />
      </div>
    </div>
  );
}

function MarketStatCard({ icon: Icon, label, value, tone = "cyan", pulse = false }) {
  const toneClass = {
    green: "border-mint/25 bg-mint/10 text-mint",
    cyan: "border-cyan/25 bg-cyan/10 text-cyan",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    red: "border-rose-300/25 bg-rose-300/10 text-rose-200"
  }[tone];

  return (
    <div className={`glass-soft rounded-lg p-4 ${pulse ? "volume-flash" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        {pulse ? <span className="market-pulse-dot" /> : null}
      </div>
      <p className="mt-4 text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function LiveTradingChart({ series, title, marketVolume, compact = false }) {
  const width = 720;
  const height = compact ? 210 : 300;
  const padding = compact ? 20 : 28;
  const highs = series.map((point) => point.high);
  const lows = series.map((point) => point.low);
  const min = Math.min(...lows) - 0.05;
  const max = Math.max(...highs) + 0.05;
  const span = Math.max(0.1, max - min);
  const xStep = (width - padding * 2) / Math.max(1, series.length - 1);
  const yFor = (value) =>
    height - padding - ((value - min) / span) * (height - padding * 2);
  const points = series.map((point, index) => ({
    ...point,
    x: padding + index * xStep,
    openY: yFor(point.open),
    closeY: yFor(point.close),
    highY: yFor(point.high),
    lowY: yFor(point.low)
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.closeY}`)
    .join(" ");
  const last = series[series.length - 1] || { close: 0, open: 0 };
  const previous = series[series.length - 2] || last;
  const trendUp = last.close >= previous.close;
  const gradientId = compact ? "marketFillCompact" : "marketFillFull";

  return (
    <div className="rounded-lg border border-white/10 bg-ink/45 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-400">
            Live price movement with candle depth and exchange volume.
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-xl font-bold ${
              trendUp ? "text-mint" : "text-rose-200"
            }`}
          >
            {last.close.toFixed(2)} EC
          </p>
          <p className="text-xs text-slate-400">
            Volume {formatMarketNumber(marketVolume)} EC
          </p>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#06101f]">
        <div className="absolute inset-0 trading-grid" />
        <svg
          aria-label="Live energy market chart"
          className={`relative z-10 h-full w-full ${
            compact ? "min-h-[210px]" : "min-h-[260px]"
          }`}
          preserveAspectRatio="none"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(69,247,169,0.22)" />
              <stop offset="100%" stopColor="rgba(69,247,169,0)" />
            </linearGradient>
          </defs>
          <path
            d={`${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
            fill={`url(#${gradientId})`}
            opacity="0.9"
          />
          {points.map((point) => {
            const up = point.close >= point.open;
            const candleTop = Math.min(point.openY, point.closeY);
            const candleHeight = Math.max(5, Math.abs(point.closeY - point.openY));
            return (
              <g key={point.id}>
                <line
                  stroke={up ? "#45f7a9" : "#fda4af"}
                  strokeLinecap="round"
                  strokeWidth="2"
                  x1={point.x}
                  x2={point.x}
                  y1={point.highY}
                  y2={point.lowY}
                />
                <rect
                  className={up ? "candle-up" : "candle-down"}
                  height={candleHeight}
                  rx="2"
                  width="8"
                  x={point.x - 4}
                  y={candleTop}
                />
              </g>
            );
          })}
          <path
            className="trading-line"
            d={linePath}
            fill="none"
            stroke={trendUp ? "#45f7a9" : "#fda4af"}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        </svg>
      </div>
    </div>
  );
}

function SmartCityGraphic() {
  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-lg border border-cyan/20 bg-ink-2/70 p-5">
      <div className="absolute inset-0 city-grid opacity-50" />
      <div className="absolute left-6 right-6 top-8 h-1 rounded-full bg-cyan/20 energy-line" />
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-3">
        {[64, 96, 132, 82, 118, 150, 74].map((height, index) => (
          <div
            className="relative w-full rounded-t-md border border-cyan/20 bg-cyan/10"
            key={height}
            style={{ height }}
          >
            <div className="absolute inset-x-2 top-3 grid grid-cols-2 gap-1">
              {Array.from({ length: Math.max(2, Math.floor(height / 22)) }).map(
                (_, cell) => (
                  <span
                    className="h-1.5 rounded-sm bg-mint/50"
                    key={`${index}-${cell}`}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute left-8 top-16 flex h-16 w-16 items-center justify-center rounded-full border border-mint/30 bg-mint/10 text-mint shadow-glow">
        <Bolt className="h-8 w-8" />
      </div>
      <div className="absolute right-8 top-20 rounded-lg border border-cyan/30 bg-cyan/10 px-4 py-3">
        <p className="text-xs uppercase text-cyan">Live Microgrid</p>
        <p className="mt-1 text-xl font-bold text-white">P2P Energy</p>
      </div>
      <div className="absolute bottom-20 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-mint shadow-glow" />
    </div>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="glass-soft rounded-lg p-5 transition hover:border-mint/30 hover:bg-white/[0.08]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-mint/25 bg-mint/10 text-mint">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function StatusGate({ user, notice, warning, logout, dataMode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass w-full max-w-2xl rounded-lg p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Account Governance Status</h1>
        <div className="mt-4 flex justify-center">
          <StatusBadge status={user.status} />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          {user.status === STATUS.PENDING_APPROVAL
            ? "Your registration is pending Admin approval. Marketplace, wallet settlement, and dashboards unlock after approval."
            : "This account cannot access platform features until Admin Governance changes the status."}
        </p>
        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4 text-left text-sm text-slate-300">
          <div className="flex items-center justify-between gap-3">
            <span>Email</span>
            <strong className="truncate text-white">{user.email}</strong>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span>Account type</span>
            <strong className="text-white">{user.role}</strong>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span>Database mode</span>
            <strong className="text-cyan">{dataMode}</strong>
          </div>
        </div>
        {notice ? <div className="mt-4"><Alert tone="success">{notice}</Alert></div> : null}
        {warning ? <div className="mt-4"><Alert tone="warning">{warning}</Alert></div> : null}
        <button
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          onClick={logout}
          type="button"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </section>
    </div>
  );
}

function TopBar({ user, dataMode, walletConnected, onConnectWallet, logout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint shadow-glow">
            <Bolt className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-mint">
              ElectraChain
            </p>
            <h1 className="truncate text-lg font-bold text-white">
              Smart City Energy Authority
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={user.role} />
          <StatusBadge status={user.status} />
          {user.producerVerified ? <StatusBadge status="Producer" /> : null}
          {user.consumerVerified ? <StatusBadge status="Consumer" /> : null}
          <span className="rounded-md border border-cyan/25 bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
            {dataMode}
          </span>
          <button
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              walletConnected
                ? "border border-mint/30 bg-mint/10 text-mint"
                : "border border-white/10 text-white hover:bg-white/10"
            }`}
            onClick={onConnectWallet}
            type="button"
          >
            <PlugZap className="h-4 w-4" />
            {walletConnected ? "Wallet Connected" : "Connect Wallet"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            onClick={logout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ items, activeView, setActiveView, user }) {
  return (
    <aside className="glass h-fit rounded-lg p-3 lg:sticky lg:top-24">
      <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-xs font-semibold uppercase text-mint">
          Smart Grid Authority
        </p>
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
      </div>
      <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.key;
          return (
            <button
              className={`group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-3 text-left text-sm font-semibold transition duration-300 ${
                active
                  ? "border border-mint/35 bg-mint/15 text-white shadow-glow"
                  : "border border-transparent text-slate-300 hover:border-cyan/20 hover:bg-white/10 hover:text-white"
              }`}
              key={item.key}
              onClick={() => setActiveView(item.key)}
              type="button"
            >
              {active ? (
                <span className="absolute left-0 top-2 h-8 w-1 rounded-r bg-mint" />
              ) : null}
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-mint" : "group-hover:text-cyan"}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function AdminAnalytics({
  analytics,
  db,
  approveUser,
  approveListing,
  approveTransaction,
  promoteToAdmin,
  miningRequestId
}) {
  const pendingUsers = db.users.filter((user) => user.status === STATUS.PENDING_APPROVAL);
  const pendingListings = db.listings.filter(
    (listing) => listing.status === STATUS.PENDING_LISTING
  );
  const pendingRequests = db.purchaseRequests.filter(
    (request) => request.status === STATUS.PENDING_TRANSACTION
  );
  const rejectedItems = [
    ...db.users
      .filter((user) => user.status === STATUS.REJECTED || user.status === STATUS.SUSPENDED)
      .map((user) => ({
        id: user.id,
        type: "User",
        subject: user.email,
        status: user.status,
        updatedAt: user.rejectedAt || user.suspendedAt || user.createdAt
      })),
    ...db.listings
      .filter((listing) => listing.status === STATUS.REJECTED)
      .map((listing) => ({
        id: listing.id,
        type: "Listing",
        subject: `${listing.energySource} - ${listing.location}`,
        status: listing.status,
        updatedAt: listing.rejectedAt || listing.createdAt
      })),
    ...db.purchaseRequests
      .filter((request) => request.status === STATUS.REJECTED)
      .map((request) => ({
        id: request.id,
        type: "Purchase",
        subject: `${request.amount} kWh`,
        status: request.status,
        updatedAt: request.rejectedAt || request.createdAt
      }))
  ].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  const cards = [
    ["Pending users", analytics.pendingUsers, Users, "amber"],
    ["Approved users", analytics.approvedUsers, UserCheck, "green"],
    ["Rejected users", analytics.rejectedUsers, XCircle, "red"],
    ["Suspended users", analytics.suspendedUsers, Ban, "red"],
    ["Pending sell listings", analytics.pendingListings, Store, "amber"],
    ["Approved listings", analytics.approvedListings, CheckCircle2, "green"],
    ["Pending purchases", analytics.pendingTransactions, ArrowRightLeft, "amber"],
    ["Approved settlements", analytics.approvedTransactions, BadgeCheck, "green"],
    ["Total energy traded", `${analytics.totalEnergyTraded} kWh`, Bolt, "cyan"],
    ["Total platform value", `${analytics.totalPlatformValue.toFixed(2)} EC`, Coins, "cyan"],
    ["Energy users", analytics.totalEnergyUsers, Users, "green"],
    ["Producer activity", analytics.totalProducers, Factory, "green"],
    ["Consumer activity", analytics.totalConsumers, Landmark, "cyan"],
    ["Open support requests", analytics.openSupportRequests, LifeBuoy, "amber"],
    ["Total admins", analytics.totalAdmins, Crown, "amber"]
  ];

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={ShieldCheck}
        eyebrow="Smart Grid Authority"
        title="Energy Analytics Command Center"
        subtitle="Government-grade oversight for user governance, energy listings, wallet settlement, and verified blockchain activity."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, icon, tone]) => (
          <MetricCard icon={icon} key={label} label={label} tone={tone} value={value} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <h3 className="text-lg font-bold text-white">Governance Queue</h3>
          <MetricBars
            rows={[
              ["Pending users", analytics.pendingUsers],
              ["Pending sell listings", analytics.pendingListings],
              ["Pending purchases", analytics.pendingTransactions],
              ["Open support requests", analytics.openSupportRequests],
              ["Mining blocks", db.purchaseRequests.filter((r) => r.status === STATUS.MINING).length]
            ]}
          />
        </Panel>
        <Panel>
          <h3 className="text-lg font-bold text-white">Platform Composition</h3>
          <MetricBars
            rows={[
              ["Producer activity badges", analytics.totalProducers],
              ["Consumer activity badges", analytics.totalConsumers],
              ["Admins", analytics.totalAdmins],
              ["Confirmed blocks", db.blockchainLogs.length]
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminQueueTable
          title="Pending Users"
          rows={pendingUsers}
          empty="No pending user approvals."
          columns={[
            ["User", (user) => <PersonCell user={user} />],
            ["Status", (user) => <StatusBadge status={user.status} />],
            [
              "Actions",
              (user) => (
                <div className="flex flex-wrap gap-2">
                  <SmallButton icon={CheckCircle2} onClick={() => approveUser(user.id)}>
                    Approve
                  </SmallButton>
                  <SmallButton
                    disabled={user.status !== STATUS.APPROVED}
                    icon={Crown}
                    onClick={() => promoteToAdmin(user.id)}
                    tone="accent"
                  >
                    Promote
                  </SmallButton>
                </div>
              )
            ]
          ]}
        />
        <AdminQueueTable
          title="Pending Sell Listings"
          rows={pendingListings}
          empty="No pending sell listings."
          columns={[
            ["Listing", (listing) => <ListingCell listing={listing} />],
            ["Seller", (listing) => listing.producerName],
            ["Energy", (listing) => `${listing.amount} kWh`],
            ["Status", (listing) => <StatusBadge status={listing.status} />],
            [
              "Actions",
              (listing) => (
                <SmallButton icon={CheckCircle2} onClick={() => approveListing(listing.id)}>
                  Approve
                </SmallButton>
              )
            ]
          ]}
        />
        <AdminQueueTable
          title="Pending Purchases"
          rows={pendingRequests}
          empty="No pending purchases."
          columns={[
            ["Buyer", (request) => userLabel(db, request.buyerId)],
            ["Seller", (request) => userLabel(db, request.sellerId)],
            ["Value", (request) => `${Number(request.totalPrice).toFixed(2)} EC`],
            ["Status", (request) => <StatusBadge status={request.status} />],
            [
              "Actions",
              (request) => (
                <SmallButton
                  icon={request.id === miningRequestId ? Loader2 : CheckCircle2}
                  loading={request.id === miningRequestId}
                  onClick={() => approveTransaction(request.id)}
                >
                  Approve
                </SmallButton>
              )
            ]
          ]}
        />
        <AdminQueueTable
          title="Approved Settlements"
          rows={db.transactions.slice(0, 6)}
          empty="No approved settlements yet."
          columns={[
            ["Hash", (tx) => <HashText value={tx.hash} />],
            ["Block", (tx) => tx.blockNumber],
            ["Energy", (tx) => `${tx.amount} kWh`],
            ["Status", (tx) => <StatusBadge status={tx.blockchainStatus} />]
          ]}
        />
        <AdminQueueTable
          title="Wallet Settlement Logs"
          rows={db.walletHistory.slice(0, 8)}
          empty="No wallet settlement logs yet."
          columns={[
            ["Owner", (entry) => userLabel(db, entry.userId)],
            ["Coins", (entry) => signed(entry.deltaCoins)],
            ["Tokens", (entry) => signed(entry.deltaTokens)],
            ["Activity", (entry) => entry.activity]
          ]}
        />
        <AdminQueueTable
          title="Rejected Items"
          rows={rejectedItems.slice(0, 8)}
          empty="No rejected or suspended records."
          columns={[
            ["Type", (item) => item.type],
            ["Subject", (item) => item.subject],
            ["Status", (item) => <StatusBadge status={item.status} />],
            ["Updated", (item) => shortDate(item.updatedAt)]
          ]}
        />
        <AdminQueueTable
          title="Blockchain Confirmations"
          rows={db.blockchainLogs.slice(0, 6)}
          empty="No blockchain confirmations yet."
          columns={[
            ["Block", (log) => log.blockNumber],
            ["Hash", (log) => <HashText value={log.transactionHash} />],
            ["Amount", (log) => `${log.amount} kWh`],
            ["Status", (log) => <StatusBadge status={log.status} />]
          ]}
        />
      </div>
    </section>
  );
}

function AdminQueueTable({ title, rows, columns, empty }) {
  return (
    <Panel>
      <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
      <DataTable columns={columns} empty={empty} rows={rows} />
    </Panel>
  );
}

function AdminSupportCenter({
  db,
  supportFilter,
  setSupportFilter,
  supportReplies,
  setSupportReplies,
  updateSupportStatus,
  replyToSupportRequest
}) {
  const requests = db.supportRequests.filter(
    (request) => supportFilter === "All" || request.status === supportFilter
  );
  const openCount = db.supportRequests.filter((request) => request.status === "Open").length;
  const reviewCount = db.supportRequests.filter(
    (request) => request.status === "In Review"
  ).length;
  const repliedCount = db.supportRequests.filter(
    (request) => request.status === "Replied"
  ).length;
  const closedCount = db.supportRequests.filter(
    (request) => request.status === "Closed"
  ).length;

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={LifeBuoy}
        eyebrow="Authority Service Desk"
        title="Support Center"
        subtitle="Review Energy User queries, add short Admin replies, and move requests through the service queue."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={MessageSquareText} label="Open requests" tone="amber" value={openCount} />
        <MetricCard icon={Activity} label="In review" tone="cyan" value={reviewCount} />
        <MetricCard icon={Send} label="Replied" tone="green" value={repliedCount} />
        <MetricCard icon={CheckCircle2} label="Closed" tone="green" value={closedCount} />
      </div>
      <Panel>
        <div className="max-w-xs">
          <FilterSelect
            value={supportFilter}
            onChange={setSupportFilter}
            options={["All", ...SUPPORT_STATUSES]}
          />
        </div>
      </Panel>
      <div className="grid gap-4">
        {requests.map((request) => {
          const replyValue =
            supportReplies[request.id] ?? request.adminReply ?? "";
          return (
            <Panel key={request.id}>
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={request.status} />
                    <span className="rounded-md border border-cyan/25 bg-cyan/10 px-2 py-1 text-xs font-semibold text-cyan">
                      {request.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{request.subject}</h3>
                  <p className="mt-2 text-sm text-slate-300">{request.message}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniBalance label="User" value={request.userName} />
                    <MiniBalance label="Email" value={request.userEmail} />
                    <MiniBalance label="Created" value={shortDate(request.createdAt)} />
                    <MiniBalance label="Updated" value={shortDate(request.updatedAt)} />
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <label className="block text-sm text-slate-200">
                    Admin reply
                    <textarea
                      className="mt-2 min-h-28 w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-white placeholder:text-slate-500"
                      onChange={(event) =>
                        setSupportReplies((current) => ({
                          ...current,
                          [request.id]: event.target.value
                        }))
                      }
                      placeholder="Write a short response for the user"
                      value={replyValue}
                    />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallButton
                      disabled={request.status === "In Review"}
                      icon={Activity}
                      onClick={() => updateSupportStatus(request.id, "In Review")}
                      tone="neutral"
                    >
                      In Review
                    </SmallButton>
                    <SmallButton
                      icon={Send}
                      onClick={() => replyToSupportRequest(request.id)}
                    >
                      Save Reply
                    </SmallButton>
                    <SmallButton
                      disabled={request.status === "Closed"}
                      icon={CheckCircle2}
                      onClick={() => updateSupportStatus(request.id, "Closed")}
                      tone="accent"
                    >
                      Close
                    </SmallButton>
                  </div>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
      {!requests.length ? (
        <EmptyState
          icon={LifeBuoy}
          title="No support requests"
          text="Energy User help requests will appear here."
        />
      ) : null}
    </section>
  );
}

function AdminUsers({
  db,
  userQuery,
  setUserQuery,
  userFilter,
  setUserFilter,
  approveUser,
  rejectUser,
  suspendUser,
  verifyUser,
  promoteToAdmin
}) {
  const users = db.users.filter((user) => {
    const haystack = `${user.name} ${user.email} ${user.role} ${user.status}`.toLowerCase();
    const matchesQuery = haystack.includes(userQuery.toLowerCase());
    const matchesFilter =
      userFilter === "All" ||
      user.status === userFilter ||
      user.role === userFilter ||
      (userFilter === "Producer Activity" && user.producerVerified) ||
      (userFilter === "Consumer Activity" && user.consumerVerified);
    return matchesQuery && matchesFilter;
  });

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={Users}
        eyebrow="Admin Governance"
        title="User Registry"
        subtitle="Approve, reject, suspend, review activity badges, or promote accounts."
      />
      <Panel>
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <SearchBox value={userQuery} onChange={setUserQuery} placeholder="Search users" />
          <FilterSelect
            value={userFilter}
            onChange={setUserFilter}
            options={[
              "All",
              STATUS.PENDING_APPROVAL,
              STATUS.APPROVED,
              STATUS.REJECTED,
              STATUS.SUSPENDED,
              "Energy User",
              "Admin",
              "Producer Activity",
              "Consumer Activity"
            ]}
          />
        </div>
      </Panel>
      <Panel>
        <DataTable
          empty="No users match the current filters."
          columns={[
            ["User", (user) => <PersonCell user={user} />],
            ["Role", (user) => <StatusBadge status={user.role} />],
            [
              "Status",
              (user) => (
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={user.status} />
                  {user.producerVerified ? <StatusBadge status="Producer" /> : null}
                  {user.consumerVerified ? <StatusBadge status="Consumer" /> : null}
                </div>
              )
            ],
            ["Created", (user) => shortDate(user.createdAt)],
            [
              "Actions",
              (user) => (
                <div className="flex flex-wrap gap-2">
                  <SmallButton
                    disabled={user.status === STATUS.APPROVED}
                    icon={CheckCircle2}
                    onClick={() => approveUser(user.id)}
                  >
                    Approve
                  </SmallButton>
                  <SmallButton
                    disabled={user.status === STATUS.REJECTED}
                    icon={XCircle}
                    onClick={() => rejectUser(user.id)}
                    tone="danger"
                  >
                    Reject
                  </SmallButton>
                  <SmallButton
                    disabled={user.status === STATUS.SUSPENDED}
                    icon={Ban}
                    onClick={() => suspendUser(user.id)}
                    tone="neutral"
                  >
                    Suspend
                  </SmallButton>
                  {user.role === "Energy User" ? (
                    <SmallButton
                      disabled={user.producerVerified}
                      icon={BadgeCheck}
                      onClick={() => verifyUser(user.id, "Producer")}
                    >
                      Mark Seller
                    </SmallButton>
                  ) : null}
                  {user.role === "Energy User" ? (
                    <SmallButton
                      disabled={user.consumerVerified}
                      icon={BadgeCheck}
                      onClick={() => verifyUser(user.id, "Consumer")}
                    >
                      Mark Buyer
                    </SmallButton>
                  ) : null}
                  <SmallButton
                    disabled={user.role === "Admin" || user.status !== STATUS.APPROVED}
                    icon={Crown}
                    onClick={() => promoteToAdmin(user.id)}
                    tone="accent"
                  >
                    Promote
                  </SmallButton>
                </div>
              )
            ]
          ]}
          rows={users}
        />
      </Panel>
    </section>
  );
}

function AdminListings({
  db,
  listingFilter,
  setListingFilter,
  approveListing,
  rejectListing
}) {
  const listings = db.listings.filter(
    (listing) => listingFilter === "All" || listing.status === listingFilter
  );

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={Store}
        eyebrow="Marketplace Governance"
        title="Sell Energy Listings"
        subtitle="Sell listings stay hidden from the marketplace until Admin approval."
      />
      <Panel>
        <div className="max-w-xs">
          <FilterSelect
            value={listingFilter}
            onChange={setListingFilter}
            options={[
              "All",
              STATUS.PENDING_LISTING,
              STATUS.APPROVED,
              STATUS.REJECTED,
              STATUS.SOLD
            ]}
          />
        </div>
      </Panel>
      <Panel>
        <DataTable
          empty="No listings match the current filter."
          columns={[
            ["Listing", (listing) => <ListingCell listing={listing} />],
            ["Producer", (listing) => listing.producerName],
            ["Energy", (listing) => `${listing.remainingAmount}/${listing.amount} kWh`],
            ["Price", (listing) => `${Number(listing.pricePerToken).toFixed(2)} EC`],
            ["Status", (listing) => <StatusBadge status={listing.status} />],
            [
              "Actions",
              (listing) => (
                <div className="flex flex-wrap gap-2">
                  <SmallButton
                    disabled={
                      listing.status === STATUS.APPROVED || listing.status === STATUS.SOLD
                    }
                    icon={CheckCircle2}
                    onClick={() => approveListing(listing.id)}
                  >
                    Approve
                  </SmallButton>
                  <SmallButton
                    disabled={
                      listing.status === STATUS.REJECTED || listing.status === STATUS.SOLD
                    }
                    icon={XCircle}
                    onClick={() => rejectListing(listing.id)}
                    tone="danger"
                  >
                    Reject
                  </SmallButton>
                </div>
              )
            ]
          ]}
          rows={listings}
        />
      </Panel>
    </section>
  );
}

function AdminTransactions({
  db,
  transactionFilter,
  setTransactionFilter,
  approveTransaction,
  rejectTransaction,
  miningRequestId
}) {
  const requests = db.purchaseRequests.filter(
    (request) => transactionFilter === "All" || request.status === transactionFilter
  );

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={ArrowRightLeft}
        eyebrow="Transaction Governance"
        title="Buy Energy Requests"
        subtitle="Wallet balances and energy tokens settle only after Admin approval."
      />
      <Panel>
        <div className="max-w-sm">
          <FilterSelect
            value={transactionFilter}
            onChange={setTransactionFilter}
            options={[
              "All",
              STATUS.PENDING_TRANSACTION,
              STATUS.MINING,
              STATUS.BLOCKCHAIN_CONFIRMED,
              STATUS.REJECTED
            ]}
          />
        </div>
      </Panel>
      <Panel>
        <DataTable
          empty="No purchase requests yet."
          columns={[
            ["Request", (request) => request.id],
            ["Buyer", (request) => userLabel(db, request.buyerId)],
            ["Seller", (request) => userLabel(db, request.sellerId)],
            ["Energy", (request) => `${request.amount} kWh`],
            ["Value", (request) => `${Number(request.totalPrice).toFixed(2)} EC`],
            ["Status", (request) => <StatusBadge status={request.status} />],
            [
              "Actions",
              (request) => (
                <div className="flex flex-wrap gap-2">
                  <SmallButton
                    disabled={request.status !== STATUS.PENDING_TRANSACTION}
                    icon={request.id === miningRequestId ? Loader2 : CheckCircle2}
                    loading={request.id === miningRequestId}
                    onClick={() => approveTransaction(request.id)}
                  >
                    Approve
                  </SmallButton>
                  <SmallButton
                    disabled={request.status !== STATUS.PENDING_TRANSACTION}
                    icon={XCircle}
                    onClick={() => rejectTransaction(request.id)}
                    tone="danger"
                  >
                    Reject
                  </SmallButton>
                </div>
              )
            ]
          ]}
          rows={requests}
        />
      </Panel>

      <Panel>
        <h3 className="mb-4 text-lg font-bold text-white">Completed Transactions</h3>
        <DataTable
          empty="No confirmed transactions yet."
          columns={[
            ["Hash", (tx) => <HashText value={tx.hash} />],
            ["Block", (tx) => tx.blockNumber],
            ["Buyer", (tx) => userLabel(db, tx.buyerId)],
            ["Seller", (tx) => userLabel(db, tx.sellerId)],
            ["Energy", (tx) => `${tx.amount} kWh`],
            ["Value", (tx) => `${Number(tx.totalPrice).toFixed(2)} EC`],
            ["Status", (tx) => <StatusBadge status={tx.blockchainStatus} />]
          ]}
          rows={db.transactions}
        />
      </Panel>
    </section>
  );
}

function WalletRegistry({ db }) {
  return (
    <section className="space-y-5">
      <SectionTitle
        icon={WalletCards}
        eyebrow="Admin Governance"
        title="Wallet Registry"
        subtitle="Confirmed balances, pending settlement, energy tokens, and generated wallet addresses."
      />
      <Panel>
        <DataTable
          empty="No wallets issued yet."
          columns={[
            ["Owner", (wallet) => userLabel(db, wallet.userId)],
            ["Address", (wallet) => <HashText value={wallet.walletAddress} />],
            ["Confirmed", (wallet) => `${Number(wallet.confirmedBalance).toFixed(2)} EC`],
            ["Pending", (wallet) => `${Number(wallet.pendingBalance).toFixed(2)} EC`],
            ["Energy Tokens", (wallet) => `${wallet.energyTokens} kWh`],
            ["Updated", (wallet) => shortDate(wallet.updatedAt)]
          ]}
          rows={db.wallets}
        />
      </Panel>
    </section>
  );
}

function UserOverview({ db, user, wallet, walletConnected, setWalletConnected }) {
  const myListings = db.listings.filter((listing) => listing.producerId === user.id);
  const myRequests = db.purchaseRequests.filter((request) => request.buyerId === user.id);
  const myTransactions = db.transactions.filter(
    (transaction) => transaction.buyerId === user.id || transaction.sellerId === user.id
  );

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={Gauge}
        eyebrow={`${user.role} Dashboard`}
        title={`Welcome, ${user.name}`}
        subtitle="Approved accounts can access marketplace, wallet, and transaction features."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={Coins}
          label="Confirmed Balance"
          tone="green"
          value={`${Number(wallet?.confirmedBalance || 0).toFixed(2)} EC`}
        />
        <MetricCard
          icon={Activity}
          label="Pending Balance"
          tone="amber"
          value={`${Number(wallet?.pendingBalance || 0).toFixed(2)} EC`}
        />
        <MetricCard
          icon={Bolt}
          label="Energy Tokens"
          tone="cyan"
          value={`${Number(wallet?.energyTokens || 0)} kWh`}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <WalletPanel
          user={user}
          wallet={wallet}
          db={db}
          walletHistory={db.walletHistory}
          walletConnected={walletConnected}
          setWalletConnected={setWalletConnected}
        />
        <Panel>
          <h3 className="text-lg font-bold text-white">Activity Snapshot</h3>
          <MetricBars
            rows={[
              ["My listings", myListings.length],
              ["Purchase requests", myRequests.length],
              ["Confirmed transactions", myTransactions.length],
              ["Blockchain logs", db.blockchainLogs.length]
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}

function WalletPanel({
  user,
  wallet,
  db,
  walletHistory = [],
  walletConnected,
  setWalletConnected
}) {
  const history = walletHistory
    .filter((entry) => entry.userId === user.id)
    .slice()
    .reverse();
  const walletAddress = wallet?.walletAddress || "Wallet pending admin approval";
  const recentActivity = history.slice(0, 8);
  const pendingSettlements = db.purchaseRequests.filter(
    (request) =>
      (request.buyerId === user.id || request.sellerId === user.id) &&
      [STATUS.PENDING_TRANSACTION, STATUS.MINING].includes(request.status)
  );
  const pendingExposure = pendingSettlements.reduce(
    (sum, request) => sum + Number(request.totalPrice || 0),
    0
  );
  const approvedSettlements = db.transactions.filter(
    (transaction) =>
      transaction.buyerId === user.id || transaction.sellerId === user.id
  );

  return (
    <Panel>
      <div className="wallet-card rounded-lg border border-mint/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-mint">
              Smart Wallet Interface
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">{user.name}</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Authority-issued wallet for energy settlement, token tracking, and
              blockchain-confirmed activity.
            </p>
          </div>
          <button
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              walletConnected
                ? "border border-mint/30 bg-mint/10 text-mint"
                : "border border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20"
            }`}
            onClick={() => setWalletConnected(true)}
            type="button"
          >
            <PlugZap className="h-4 w-4" />
            {walletConnected ? "Wallet Connected" : "Connect Wallet"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniBalance label="EnergyCoins" value={`${Number(wallet?.confirmedBalance || 0).toFixed(2)} EC`} />
        <MiniBalance label="Confirmed" value={`${Number(wallet?.confirmedBalance || 0).toFixed(2)} EC`} />
        <MiniBalance label="Pending" value={`${pendingExposure.toFixed(2)} EC`} />
        <MiniBalance label="Energy Tokens" value={`${Number(wallet?.energyTokens || 0)} kWh`} />
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Wallet Address
          </p>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-cyan/25 bg-cyan/10 px-2.5 py-2 text-xs font-semibold text-cyan hover:bg-cyan/20"
            onClick={() => navigator.clipboard?.writeText(walletAddress)}
            type="button"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
        </div>
        <p className="mt-2 break-all font-mono text-sm text-electric">
          {walletAddress}
        </p>
      </div>

      <WalletChart history={history} />
      <WalletGraphs history={history} />
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <PanelInset title="Pending Settlements">
          <DataTable
            empty="No pending settlements."
            columns={[
              ["Counterparty", (request) =>
                request.buyerId === user.id
                  ? userLabel(db, request.sellerId)
                  : userLabel(db, request.buyerId)
              ],
              ["Energy", (request) => `${request.amount} kWh`],
              ["Value", (request) => `${Number(request.totalPrice).toFixed(2)} EC`],
              ["Status", (request) => <StatusBadge status={request.status} />]
            ]}
            rows={pendingSettlements}
          />
        </PanelInset>
        <PanelInset title="Approved Settlements">
          <DataTable
            empty="No approved settlements."
            columns={[
              ["Hash", (transaction) => <CopyHash value={transaction.hash} />],
              ["Energy", (transaction) => `${transaction.amount} kWh`],
              ["Value", (transaction) => `${Number(transaction.totalPrice).toFixed(2)} EC`],
              ["Status", (transaction) => <StatusBadge status={transaction.blockchainStatus} />]
            ]}
            rows={approvedSettlements}
          />
        </PanelInset>
      </div>
      <PanelInset title="Recent Wallet Activity">
        <DataTable
          empty="Waiting for wallet activity."
          columns={[
            ["Activity", (entry) => entry.activity],
            ["Coins", (entry) => signed(entry.deltaCoins)],
            ["Tokens", (entry) => signed(entry.deltaTokens)],
            ["Timestamp", (entry) => shortDate(entry.createdAt)]
          ]}
          rows={recentActivity}
        />
      </PanelInset>
    </Panel>
  );
}

function WalletChart({ history }) {
  const rows = history.length
    ? history.slice(-8)
    : [
        {
          id: "empty-chart",
          confirmedBalance: 0,
          energyTokens: 0,
          deltaCoins: 0,
          deltaTokens: 0,
          activity: "No activity yet"
        }
      ];
  const maxCoins = Math.max(1, ...rows.map((row) => Number(row.confirmedBalance || 0)));
  const maxTokens = Math.max(1, ...rows.map((row) => Number(row.energyTokens || 0)));

  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <LineChart className="h-4 w-4 text-mint" />
            Wallet value over time
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Charts update when buy and sell settlements are approved.
          </p>
        </div>
        <StatusBadge status="Buy/Sell Activity" />
      </div>
      <div className="grid min-h-[180px] grid-cols-4 items-end gap-3 sm:grid-cols-8">
        {rows.map((row, index) => (
          <div className="flex min-w-0 flex-col items-center gap-2" key={row.id || index}>
            <div className="flex h-32 w-full items-end justify-center gap-1 rounded-md border border-white/10 bg-ink/40 px-1 pb-1">
              <span
                className="w-3 rounded-t bg-mint"
                style={{
                  height: `${Math.max(8, (Number(row.confirmedBalance || 0) / maxCoins) * 100)}%`
                }}
                title="EnergyCoins"
              />
              <span
                className="w-3 rounded-t bg-cyan"
                style={{
                  height: `${Math.max(8, (Number(row.energyTokens || 0) / maxTokens) * 100)}%`
                }}
                title="Energy tokens"
              />
            </div>
            <p className="w-full truncate text-center text-[11px] text-slate-400">
              {row.activity}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniBalance label="Latest coin change" value={signed(rows[rows.length - 1]?.deltaCoins || 0)} />
        <MiniBalance label="Latest token change" value={signed(rows[rows.length - 1]?.deltaTokens || 0)} />
        <MiniBalance label="History points" value={history.length} />
      </div>
    </div>
  );
}

function WalletGraphs({ history }) {
  const rows = history.length ? history.slice(-6) : [];
  const tokenMax = Math.max(1, ...rows.map((row) => Number(row.energyTokens || 0)));
  const coinDeltaMax = Math.max(
    1,
    ...rows.map((row) => Math.abs(Number(row.deltaCoins || 0)))
  );
  const tokenDeltaMax = Math.max(
    1,
    ...rows.map((row) => Math.abs(Number(row.deltaTokens || 0)))
  );

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <MiniGraph
        color="mint"
        label="Token Balance Graph"
        max={tokenMax}
        rows={rows.map((row) => ({
          id: row.id,
          label: row.activity,
          value: Number(row.energyTokens || 0)
        }))}
      />
      <MiniGraph
        color="cyan"
        label="Energy Usage Graph"
        max={tokenDeltaMax}
        rows={rows.map((row) => ({
          id: `${row.id}-tokens`,
          label: row.activity,
          value: Math.abs(Number(row.deltaTokens || 0))
        }))}
      />
      <MiniGraph
        color="amber"
        label="Pending vs Confirmed Activity"
        max={coinDeltaMax}
        rows={rows.map((row) => ({
          id: `${row.id}-coins`,
          label: row.activity,
          value: Math.abs(Number(row.deltaCoins || 0))
        }))}
      />
    </div>
  );
}

function MiniGraph({ label, rows, max, color }) {
  const colorClass = {
    mint: "bg-mint",
    cyan: "bg-cyan",
    amber: "bg-amber-300"
  }[color];

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-sm font-bold text-white">{label}</h3>
      <div className="flex h-28 items-end gap-2">
        {(rows.length ? rows : [{ id: "empty", value: 0, label: "Waiting" }]).map(
          (row) => (
            <span
              className={`w-full rounded-t ${colorClass} opacity-90 transition-all duration-500`}
              key={row.id}
              style={{ height: `${Math.max(8, (Number(row.value || 0) / max) * 100)}%` }}
              title={row.label}
            />
          )
        )}
      </div>
    </div>
  );
}

function Marketplace({
  db,
  currentUser,
  tradeMode,
  setTradeMode,
  listingForm,
  setListingForm,
  submitListing,
  marketQuery,
  setMarketQuery,
  purchaseAmounts,
  setPurchaseAmounts,
  requestPurchase
}) {
  const listings = db.listings.filter((listing) => {
    const haystack = `${listing.energySource} ${listing.location} ${listing.description} ${listing.producerName}`.toLowerCase();
    return (
      listing.status === STATUS.APPROVED &&
      Number(listing.remainingAmount || 0) > 0 &&
      haystack.includes(marketQuery.toLowerCase())
    );
  });
  const myListings = db.listings.filter(
    (listing) => listing.producerId === currentUser.id
  );
  const myActiveSellListings = myListings.filter(
    (listing) =>
      listing.status === STATUS.APPROVED && Number(listing.remainingAmount || 0) > 0
  );
  const myPurchaseRequests = db.purchaseRequests.filter(
    (request) => request.buyerId === currentUser.id
  );
  const myPendingRequests = myPurchaseRequests.filter(
    (request) =>
      [STATUS.PENDING_TRANSACTION, STATUS.MINING].includes(request.status)
  );
  const listingGroups = [
    ["Pending listings", myListings.filter((listing) => listing.status === STATUS.PENDING_LISTING)],
    ["Approved listings", myListings.filter((listing) => listing.status === STATUS.APPROVED)],
    ["Rejected listings", myListings.filter((listing) => listing.status === STATUS.REJECTED)],
    ["Sold listings", myListings.filter((listing) => listing.status === STATUS.SOLD)]
  ];

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={Store}
        eyebrow="Energy User Marketplace"
        title="Energy Trading Exchange"
        subtitle="Choose how you want to trade today. The same approved Energy User can sell surplus energy in Producer mode or request energy in Consumer mode."
      />
      <MarketCommandBar db={db} listings={listings} />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-mint">
              Trading Mode
            </p>
            <h3 className="mt-1 text-xl font-bold text-white">
              Choose how you want to trade today.
            </h3>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            {[
              ["producer", "Use as Producer", Factory],
              ["consumer", "Use as Consumer", ShoppingCart]
            ].map(([mode, label, Icon]) => (
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  tradeMode === mode
                    ? "border-mint/40 bg-mint/15 text-white shadow-glow"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan/30 hover:bg-cyan/10 hover:text-white"
                }`}
                key={mode}
                onClick={() => setTradeMode(mode)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {tradeMode === "producer" ? (
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-mint/25 bg-mint/10 text-mint">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Sell Energy</h3>
              <p className="text-sm text-slate-300">
                Status after submission: Pending Admin Approval
              </p>
            </div>
          </div>
          <form className="grid gap-4" onSubmit={submitListing}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Energy amount (kWh)"
                onChange={(value) =>
                  setListingForm((current) => ({ ...current, amount: value }))
                }
                type="number"
                value={listingForm.amount}
              />
              <Field
                label="Price per kWh (EnergyCoins)"
                onChange={(value) =>
                  setListingForm((current) => ({ ...current, pricePerToken: value }))
                }
                type="number"
                value={listingForm.pricePerToken}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-200">
                Energy source
                <select
                  className="mt-2 w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-white"
                  onChange={(event) =>
                    setListingForm((current) => ({
                      ...current,
                      energySource: event.target.value
                    }))
                  }
                  value={listingForm.energySource}
                >
                  {energySources.map((source) => (
                    <option key={source}>{source}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Location"
                onChange={(value) =>
                  setListingForm((current) => ({ ...current, location: value }))
                }
                value={listingForm.location}
              />
            </div>
            <label className="block text-sm text-slate-200">
              Description
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-white"
                onChange={(event) =>
                  setListingForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                value={listingForm.description}
              />
            </label>
            <PrimaryButton icon={Plus} type="submit">
              Submit Listing for Admin Approval
            </PrimaryButton>
          </form>
        </Panel>
      ) : (
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan/25 bg-cyan/10 text-cyan">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Buy Energy</h3>
              <p className="text-sm text-slate-300">
                Purchase requests settle only after Admin approval.
              </p>
            </div>
          </div>
          <SearchBox
            value={marketQuery}
            onChange={setMarketQuery}
            placeholder="Search source, location, or seller"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniBalance label="Approved listings" value={listings.length} />
            <MiniBalance label="My pending purchases" value={myPendingRequests.length} />
          </div>

          <div className="mt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Approved Listings Grid</h3>
                <p className="mt-1 text-sm text-slate-300">
                  Select an approved sell listing and request a settlement.
                </p>
              </div>
              <StatusBadge status={STATUS.APPROVED} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {listings.map((listing) => (
                <article className="rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-mint/30 hover:bg-mint/10" key={listing.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={listing.status} />
                        <span className="rounded-md border border-cyan/25 bg-cyan/10 px-2 py-1 text-xs font-semibold text-cyan">
                          {listing.energySource}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-white">
                        {listing.location}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {listing.description}
                      </p>
                    </div>
                    <div className="rounded-lg border border-mint/20 bg-mint/10 p-3 text-right">
                      <p className="text-xs text-slate-300">Price per kWh</p>
                      <p className="text-lg font-bold text-mint">
                        {Number(listing.pricePerToken).toFixed(2)} EC
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniBalance label="Available" value={`${listing.remainingAmount} kWh`} />
                    <MiniBalance label="Seller" value={listing.producerName} />
                    <MiniBalance label="Created" value={shortDate(listing.createdAt)} />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[140px_1fr]">
                    <input
                      className="rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-white"
                      min="1"
                      onChange={(event) =>
                        setPurchaseAmounts((current) => ({
                          ...current,
                          [listing.id]: event.target.value
                        }))
                      }
                      type="number"
                      value={purchaseAmounts[listing.id] || "1"}
                    />
                    <PrimaryButton
                      disabled={listing.producerId === currentUser.id}
                      icon={ArrowRightLeft}
                      onClick={() => requestPurchase(listing)}
                      type="button"
                    >
                      Request Purchase
                    </PrimaryButton>
                  </div>
                </article>
              ))}
            </div>
            {!listings.length ? (
              <div className="mt-4">
                <EmptyState
                  icon={Store}
                  title="No approved listings"
                  text="Admin-approved sell energy listings will appear here."
                />
              </div>
            ) : null}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h3 className="mb-4 text-lg font-bold text-white">My Active Sell Listings</h3>
          <DataTable
            empty="No active sell listings."
            columns={[
              ["Listing", (listing) => <ListingCell listing={listing} />],
              ["Energy", (listing) => `${listing.remainingAmount}/${listing.amount} kWh`],
              ["Price", (listing) => `${Number(listing.pricePerToken).toFixed(2)} EC/kWh`],
              ["Status", (listing) => <StatusBadge status={listing.status} />]
            ]}
            rows={myActiveSellListings}
          />
        </Panel>
        <Panel>
          <h3 className="mb-4 text-lg font-bold text-white">My Purchase Requests</h3>
          <DataTable
            empty="No purchase requests."
            columns={[
              ["Seller", (request) => userLabel(db, request.sellerId)],
              ["Energy", (request) => `${request.amount} kWh`],
              ["Value", (request) => `${Number(request.totalPrice).toFixed(2)} EC`],
              ["Status", (request) => <StatusBadge status={request.status} />]
            ]}
            rows={myPurchaseRequests}
          />
        </Panel>
      </div>

      <Panel>
        <h3 className="mb-4 text-lg font-bold text-white">Producer Listing Status</h3>
        <div className="grid gap-4 xl:grid-cols-2">
          {listingGroups.map(([title, rows]) => (
            <PanelInset key={title} title={title}>
              <DataTable
                empty={`No ${title.toLowerCase()}.`}
                columns={[
                  ["Listing", (listing) => <ListingCell listing={listing} />],
                  ["Energy", (listing) => `${listing.remainingAmount}/${listing.amount} kWh`],
                  ["Price", (listing) => `${Number(listing.pricePerToken).toFixed(2)} EC/kWh`],
                  ["Status", (listing) => <StatusBadge status={listing.status} />]
                ]}
                rows={rows}
              />
            </PanelInset>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function MarketCommandBar({ db, listings }) {
  const totalEnergy = db.transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  );
  const marketVolume = calculateMarketVolume(db);
  const animatedVolume = useAnimatedNumber(marketVolume);
  const marketSeries = useLiveMarketSeries(db.transactions.length + 100);
  const pendingSettlements = db.purchaseRequests.filter(
    (request) =>
      request.status === STATUS.PENDING_TRANSACTION || request.status === STATUS.MINING
  ).length;
  const tradingActivity = createMarketActivityRows(db).slice(0, 3);

  return (
    <Panel>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <MarketStatCard
            icon={CircleDollarSign}
            label="Market Volume"
            pulse
            tone="green"
            value={`${formatMarketNumber(animatedVolume)} EC`}
          />
          <MarketStatCard
            icon={Bolt}
            label="Total Energy Traded"
            tone="cyan"
            value={`${formatMarketNumber(totalEnergy)} kWh`}
          />
          <MarketStatCard
            icon={Store}
            label="Active Listings"
            tone="green"
            value={listings.length}
          />
          <MarketStatCard
            icon={Activity}
            label="Pending Settlements"
            tone="amber"
            value={pendingSettlements}
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">Live Energy Market</h3>
            <span className="inline-flex items-center gap-2 rounded-md border border-mint/25 bg-mint/10 px-2 py-1 text-xs font-semibold text-mint">
              <span className="online-dot" />
              Market Online
            </span>
          </div>
          <MarketTicker />
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <LiveTradingChart
              compact
              marketVolume={animatedVolume}
              series={marketSeries}
              title="EnergyCoin Index"
            />
            <div className="grid content-start gap-2">
              {tradingActivity.map((activity) => (
                <div
                  className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300"
                  key={activity.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{activity.label}</span>
                    <span
                      className={
                        activity.trend === "up" ? "text-mint" : "text-rose-200"
                      }
                    >
                      {activity.value}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{activity.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function HelpSupport({
  db,
  user,
  supportForm,
  setSupportForm,
  submitSupportRequest
}) {
  const myRequests = db.supportRequests.filter(
    (request) => request.userId === user.id
  );

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={LifeBuoy}
        eyebrow="Help & Support"
        title="ElectraChain Support Desk"
        subtitle="Submit marketplace, wallet, listing, purchase, or account questions to the ElectraChain Admin team."
      />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint shadow-glow">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-mint">
                New Support Query
              </p>
              <h2 className="text-2xl font-bold text-white">
                Tell us what happened
              </h2>
            </div>
          </div>
          <form className="space-y-4" onSubmit={submitSupportRequest}>
            <label className="block text-sm text-slate-200">
              Issue category
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-white"
                onChange={(event) =>
                  setSupportForm((current) => ({
                    ...current,
                    category: event.target.value
                  }))
                }
                value={supportForm.category}
              >
                {SUPPORT_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <Field
              label="Subject"
              onChange={(value) =>
                setSupportForm((current) => ({ ...current, subject: value }))
              }
              value={supportForm.subject}
            />
            <label className="block text-sm text-slate-200">
              Message / Comment
              <textarea
                className="mt-2 min-h-36 w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-white placeholder:text-slate-500"
                onChange={(event) =>
                  setSupportForm((current) => ({
                    ...current,
                    message: event.target.value
                  }))
                }
                placeholder="Describe the issue or question"
                value={supportForm.message}
              />
            </label>
            <PrimaryButton icon={Send} type="submit">
              Submit Support Request
            </PrimaryButton>
          </form>
        </Panel>
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">My Submitted Queries</h3>
              <p className="mt-1 text-sm text-slate-300">
                Admin replies and status updates appear here.
              </p>
            </div>
            {myRequests.length ? (
              <StatusBadge status={myRequests[0].status} />
            ) : (
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-300">
                No requests
              </span>
            )}
          </div>
          <div className="grid gap-4">
            {myRequests.map((request) => (
              <div
                className="rounded-lg border border-white/10 bg-white/5 p-4"
                key={request.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-cyan">
                      {request.category}
                    </p>
                    <h4 className="mt-1 text-lg font-bold text-white">
                      {request.subject}
                    </h4>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {request.message}
                </p>
                {request.adminReply ? (
                  <div className="mt-4 rounded-lg border border-mint/25 bg-mint/10 p-4">
                    <p className="text-xs font-semibold uppercase text-mint">
                      Admin Reply
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-100">
                      {request.adminReply}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-white/10 bg-ink/35 p-4 text-sm text-slate-300">
                    Waiting for an Admin response.
                  </div>
                )}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <MiniBalance label="Created" value={shortDate(request.createdAt)} />
                  <MiniBalance label="Updated" value={shortDate(request.updatedAt)} />
                </div>
              </div>
            ))}
            {!myRequests.length ? (
              <EmptyState
                icon={LifeBuoy}
                title="No queries submitted"
                text="Submit a support request and the Admin team can respond from the Support Center."
              />
            ) : null}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function AccessRestricted() {
  return (
    <section className="space-y-5">
      <SectionTitle
        icon={ShieldCheck}
        eyebrow="Restricted Area"
        title="Access restricted. Admin permission required."
        subtitle="Energy Blockchain, Chain Explorer, Storage Viewer, and Data Management are available only to Admin users."
      />
      <Panel>
        <EmptyState
          icon={Lock}
          title="Admin permission required"
          text="Use Help & Support if you need assistance with marketplace, wallet, listing, purchase, or account activity."
        />
      </Panel>
    </section>
  );
}

function UserActivity({ db, currentUser }) {
  const requests = db.purchaseRequests.filter(
    (request) => request.buyerId === currentUser.id
  );
  const transactions = db.transactions.filter(
    (transaction) =>
      transaction.buyerId === currentUser.id || transaction.sellerId === currentUser.id
  );
  const listings = db.listings.filter(
    (listing) => listing.producerId === currentUser.id
  );

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={History}
        eyebrow="Energy User Activity"
        title="Listings, Requests, and Transactions"
        subtitle="Track sell listings, purchase requests, and blockchain-confirmed activity in one place."
      />
      <Panel>
        <h3 className="mb-4 text-lg font-bold text-white">Sell Listings</h3>
        <DataTable
          empty="No sell listings yet."
          columns={[
            ["Listing", (listing) => <ListingCell listing={listing} />],
            ["Energy", (listing) => `${listing.remainingAmount}/${listing.amount} kWh`],
            ["Price", (listing) => `${Number(listing.pricePerToken).toFixed(2)} EC`],
            ["Status", (listing) => <StatusBadge status={listing.status} />],
            ["Created", (listing) => shortDate(listing.createdAt)]
          ]}
          rows={listings}
        />
      </Panel>
      <Panel>
        <h3 className="mb-4 text-lg font-bold text-white">Buy Requests</h3>
        <DataTable
          empty="No purchase requests yet."
          columns={[
            ["Listing", (request) => request.listingId],
            ["Seller", (request) => userLabel(db, request.sellerId)],
            ["Energy", (request) => `${request.amount} kWh`],
            ["Value", (request) => `${Number(request.totalPrice).toFixed(2)} EC`],
            ["Status", (request) => <StatusBadge status={request.status} />],
            ["Hash", (request) => <HashText value={request.blockchainHash || "-"} />]
          ]}
          rows={requests}
        />
      </Panel>
      <Panel>
        <h3 className="mb-4 text-lg font-bold text-white">Confirmed Transactions</h3>
        <DataTable
          empty="No blockchain-confirmed purchases yet."
          columns={[
            ["Hash", (transaction) => <HashText value={transaction.hash} />],
            ["Block", (transaction) => transaction.blockNumber],
            [
              "Direction",
              (transaction) =>
                transaction.buyerId === currentUser.id ? "Buy" : "Sell"
            ],
            ["Energy", (transaction) => `${transaction.amount} kWh`],
            ["Value", (transaction) => `${Number(transaction.totalPrice).toFixed(2)} EC`],
            ["Status", (transaction) => <StatusBadge status={transaction.blockchainStatus} />]
          ]}
          rows={transactions}
        />
      </Panel>
    </section>
  );
}

function BlockchainNetwork({
  db,
  miningRequestId,
  walletConnected,
  setWalletConnected
}) {
  const miningRequest = db.purchaseRequests.find(
    (request) => request.id === miningRequestId || request.status === STATUS.MINING
  );

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={Blocks}
        eyebrow="Energy Blockchain Network"
        title="Smart Energy Blockchain Infrastructure"
        subtitle="Authority-verified energy settlements are mined, sealed, and indexed with settlement hashes, block numbers, and verification status."
      />
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="online-dot" />
                <h3 className="text-lg font-bold text-white">Live Chain Status</h3>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                Smart-grid settlement network with authority verification and wallet gateway access.
              </p>
            </div>
            <button
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                walletConnected
                  ? "border border-mint/30 bg-mint/10 text-mint"
                  : "border border-white/10 text-white hover:bg-white/10"
              }`}
              onClick={() => setWalletConnected(true)}
              type="button"
            >
              <PlugZap className="h-4 w-4" />
              {walletConnected ? "Wallet Connected" : "Connect Wallet"}
            </button>
          </div>

          <BlockchainNodeMap mining={Boolean(miningRequest)} />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MiniBalance label="Active Nodes" value="12" />
            <MiniBalance label="Verified Blocks" value={db.blockchainLogs.length} />
            <MiniBalance label="Energy Settlements" value={db.transactions.length} />
            <MiniBalance label="Network Status" value="Operational" />
            <MiniBalance label="Authority Verification" value="Enabled" />
            <MiniBalance label="Chain Activity" value={miningRequest ? "Verifying" : "Stable"} />
          </div>
          {miningRequest ? (
            <div className="mining-pulse mt-5 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4">
              <div className="flex items-center gap-3 text-amber-200">
                <Loader2 className="h-5 w-5 animate-spin" />
                <strong>Settlement verification in progress</strong>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Request {miningRequest.id} is being verified by the energy settlement network.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-mint/20 bg-mint/10 p-4">
              <div className="flex items-center gap-3 text-mint">
                <BadgeCheck className="h-5 w-5" />
                <strong>Blockchain Network Operational</strong>
              </div>
            </div>
          )}
        </Panel>
        <BlockchainExplorer db={db} compact />
      </div>
    </section>
  );
}

function BlockchainNodeMap({ mining }) {
  const nodes = [
    "left-[14%] top-[24%]",
    "left-[42%] top-[12%]",
    "left-[72%] top-[28%]",
    "left-[24%] top-[66%]",
    "left-[56%] top-[58%]",
    "left-[82%] top-[74%]"
  ];

  return (
    <div className="network-field mt-5 h-64 rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="network-pulse" />
      <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-mint/40 bg-mint/10 text-mint shadow-glow">
        <Blocks className="h-7 w-7" />
      </div>
      {nodes.map((position, index) => (
        <span
          className={`chain-node ${position} ${mining ? "chain-node-active" : ""}`}
          key={position}
          style={{ animationDelay: `${index * 180}ms` }}
        />
      ))}
      <div className="connection-line left-[18%] top-[38%] w-[62%] rotate-[12deg]" />
      <div className="connection-line left-[28%] top-[58%] w-[48%] -rotate-[18deg]" />
      <div className="connection-line left-[45%] top-[34%] w-[36%] rotate-[48deg]" />
    </div>
  );
}

function BlockchainExplorer({ db, compact = false }) {
  return (
    <section className={compact ? "" : "space-y-5"}>
      {!compact ? (
        <SectionTitle
          icon={Blocks}
          eyebrow="Chain Explorer"
          title="Verified Energy Settlement Blocks"
          subtitle="Every authority-approved settlement receives a block number, timestamp, and verified blockchain settlement hash."
        />
      ) : null}
      <Panel>
        <DataTable
          empty="Waiting for verified blockchain settlements."
          columns={[
            ["Block", (log) => log.blockNumber],
            ["Settlement Hash", (log) => <CopyHash value={log.transactionHash} />],
            ["Buyer", (log) => <PersonMini name={log.buyer} email={log.buyerEmail} />],
            ["Seller", (log) => <PersonMini name={log.seller} email={log.sellerEmail} />],
            ["Amount", (log) => `${log.amount} kWh`],
            ["Status", (log) => <StatusBadge status={log.status} />],
            ["Timestamp", (log) => shortDate(log.timestamp)]
          ]}
          rows={db.blockchainLogs}
        />
      </Panel>
    </section>
  );
}

function StorageViewer({ db, onReset }) {
  const tables = [
    ["users", db.users],
    ["wallets", db.wallets],
    ["listings", db.listings],
    ["purchase_requests", db.purchaseRequests],
    ["settlements", db.transactions],
    ["support_requests", db.supportRequests],
    ["approvals", db.approvals],
    ["blockchain_logs", db.blockchainLogs],
    ["wallet_activity", db.walletHistory]
  ];

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={Database}
        eyebrow="Data Management"
        title="Authority Data Registry"
        subtitle="Local browser storage tables aligned with the Supabase-ready data model."
      />
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Fallback Database</h3>
            <p className="mt-1 text-sm text-slate-300">
              Data persists in browser localStorage until reset.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-300/20"
            onClick={onReset}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Data Store
          </button>
        </div>
      </Panel>
      {tables.map(([name, rows]) => (
        <Panel key={name}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <span className="rounded-md border border-cyan/25 bg-cyan/10 px-2 py-1 text-xs font-semibold text-cyan">
              {rows.length} rows
            </span>
          </div>
          <RawTable rows={rows} />
        </Panel>
      ))}
    </section>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title, subtitle }) {
  return (
    <div className="glass rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint shadow-glow">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-mint">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }) {
  return <div className="glass rounded-lg p-4 md:p-5">{children}</div>;
}

function PanelInset({ title, children }) {
  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}

function SignalCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-soft rounded-lg p-4">
      <Icon className="mb-3 h-5 w-5 text-mint" />
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }) {
  const toneClass = {
    green: "border-mint/25 bg-mint/10 text-mint",
    cyan: "border-cyan/25 bg-cyan/10 text-cyan",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    red: "border-rose-300/25 bg-rose-300/10 text-rose-200"
  }[tone || "cyan"];

  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-right text-2xl font-bold text-white">{value}</p>
      </div>
      <p className="mt-4 text-sm text-slate-300">{label}</p>
    </div>
  );
}

function MetricBars({ rows }) {
  const max = Math.max(1, ...rows.map(([, value]) => Number(value) || 0));
  return (
    <div className="mt-5 space-y-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300">{label}</span>
            <strong className="text-white">{value}</strong>
          </div>
          <div className="h-3 rounded-full bg-white/10">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-mint to-cyan"
              style={{ width: `${Math.max(4, (Number(value) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block text-sm text-slate-200">
      {label}
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-white placeholder:text-slate-500"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="w-full rounded-lg border border-white/10 bg-ink-2 py-3 pl-10 pr-3 text-white placeholder:text-slate-500"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <label className="relative block">
      <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        className="w-full rounded-lg border border-white/10 bg-ink-2 py-3 pl-10 pr-3 text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PrimaryButton({ children, icon: Icon, type = "button", onClick, disabled }) {
  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-mint px-4 py-3 text-sm font-bold text-ink shadow-glow transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </button>
  );
}

function SmallButton({
  children,
  icon: Icon,
  onClick,
  disabled,
  tone = "primary",
  loading = false
}) {
  const styles = {
    primary: "border-mint/25 bg-mint/10 text-mint hover:bg-mint/20",
    danger: "border-rose-300/25 bg-rose-300/10 text-rose-200 hover:bg-rose-300/20",
    neutral: "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
    accent: "border-amber-300/25 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20"
  }[tone];

  return (
    <button
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {children}
    </button>
  );
}

function Alert({ children, tone }) {
  const style =
    tone === "warning"
      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
      : "border-mint/30 bg-mint/10 text-mint";
  return <div className={`rounded-lg border px-4 py-3 text-sm ${style}`}>{children}</div>;
}

function StatusBadge({ status }) {
  const styles = {
    [STATUS.APPROVED]: "border-mint/30 bg-mint/10 text-mint",
    [STATUS.PENDING_APPROVAL]: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    [STATUS.PENDING_LISTING]: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    [STATUS.PENDING_TRANSACTION]: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    [STATUS.REJECTED]: "border-rose-300/30 bg-rose-300/10 text-rose-200",
    [STATUS.SUSPENDED]: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    [STATUS.SOLD]: "border-cyan/30 bg-cyan/10 text-cyan",
    [STATUS.MINING]: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    [STATUS.BLOCKCHAIN_CONFIRMED]: "border-mint/30 bg-mint/10 text-mint",
    Admin: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    "Energy User": "border-cyan/30 bg-cyan/10 text-cyan",
    Producer: "border-mint/30 bg-mint/10 text-mint",
    Consumer: "border-cyan/30 bg-cyan/10 text-cyan",
    Open: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    "In Review": "border-cyan/30 bg-cyan/10 text-cyan",
    Replied: "border-mint/30 bg-mint/10 text-mint",
    Closed: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    "Buy/Sell Activity": "border-white/10 bg-white/5 text-slate-200"
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${
        styles[status] || "border-white/10 bg-white/5 text-slate-200"
      }`}
    >
      {status === STATUS.MINING ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {status === STATUS.BLOCKCHAIN_CONFIRMED ? (
        <BadgeCheck className="h-3 w-3" />
      ) : null}
      {status}
    </span>
  );
}

function DataTable({ columns, rows, empty }) {
  if (!rows.length) {
    return <EmptyState icon={Eye} title={empty} text="Records will appear here when authority activity is available." />;
  }

  return (
    <div className="table-scroll overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-400">
            {columns.map(([label]) => (
              <th className="px-3 py-2 font-semibold" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="rounded-lg bg-white/[0.04]" key={row.id}>
              {columns.map(([label, render]) => (
                <td className="max-w-xs px-3 py-3 align-top text-slate-200" key={label}>
                  {render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RawTable({ rows }) {
  if (!rows.length) {
    return <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">No rows.</p>;
  }

  const keys = Object.keys(rows[0]);
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs">
        <thead>
          <tr className="uppercase text-slate-400">
            {keys.map((key) => (
              <th className="px-3 py-2 font-semibold" key={key}>
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="bg-white/[0.04]" key={row.id}>
              {keys.map((key) => (
                <td className="max-w-[260px] px-3 py-3 align-top text-slate-300" key={key}>
                  <span className="line-clamp-3 break-words font-mono">
                    {key.toLowerCase().includes("password")
                      ? "********"
                      : String(row[key] ?? "")}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{text}</p>
    </div>
  );
}

function MiniBalance({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 min-w-0 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function PersonCell({ user }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-white">{user.name}</p>
      <p className="truncate text-xs text-slate-400">{user.email}</p>
    </div>
  );
}

function PersonMini({ name, email }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-white">{name}</p>
      <p className="truncate text-xs text-slate-400">{email}</p>
    </div>
  );
}

function ListingCell({ listing }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-white">{listing.energySource}</p>
      <p className="truncate text-xs text-slate-400">{listing.location}</p>
    </div>
  );
}

function HashText({ value }) {
  const text = String(value || "");
  const display =
    text.length > 18 ? `${text.slice(0, 10)}...${text.slice(-6)}` : text;
  return (
    <span className="block max-w-[220px] truncate font-mono text-xs text-electric" title={value}>
      {display}
    </span>
  );
}

function CopyHash({ value }) {
  return (
    <div className="flex max-w-[240px] items-center gap-2">
      <HashText value={value} />
      <button
        className="rounded-md border border-cyan/20 bg-cyan/10 p-1.5 text-cyan transition hover:bg-cyan/20"
        onClick={() => navigator.clipboard?.writeText(String(value || ""))}
        title="Copy settlement hash"
        type="button"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function userLabel(db, userId) {
  const user = db.users.find((candidate) => candidate.id === userId);
  return user ? <PersonMini name={user.name} email={user.email} /> : userId;
}

function shortDate(value) {
  if (!value) {
    return "-";
  }
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function signed(value) {
  const number = roundCurrency(value);
  if (number > 0) {
    return `+${number}`;
  }
  return String(number);
}
