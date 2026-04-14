// Format INR currency
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// Format numbers (1200 → 1.2K)
export const formatNumber = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

// Format date
export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const timeFromNow = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return 'just now';
};

// Get avatar placeholder (initials)
export const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

// Tournament status config
export const statusConfig = {
  draft:                { label: 'Draft',      color: 'gray'   },
  published:            { label: 'Pending',    color: 'yellow' },
  registration_open:    { label: 'Open',       color: 'green'  },
  registration_closed:  { label: 'Closed',     color: 'yellow' },
  ongoing:              { label: 'Live',       color: 'blue'   },
  completed:            { label: 'Completed',  color: 'gray'   },
  cancelled:            { label: 'Cancelled',  color: 'red'    },
};

// Sport emoji map
export const sportEmoji = {
  cricket:       '🏏',
  football:      '⚽',
  basketball:    '🏀',
  badminton:     '🏸',
  tennis:        '🎾',
  volleyball:    '🏐',
  kabaddi:       '🤼',
  'kho-kho':     '🏃',
  'table-tennis':'🏓',
  chess:         '♟️',
  swimming:      '🏊',
  athletics:     '🏃',
  boxing:        '🥊',
  wrestling:     '🤼',
  archery:       '🏹',
  other:         '🏅',
};

// Win rate color
export const winRateColor = (rate) => {
  if (rate >= 65) return 'var(--green)';
  if (rate >= 45) return 'var(--accent)';
  return 'var(--red)';
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      console.log("Razorpay loaded ✅");
      resolve(true);
    };

    script.onerror = () => {
      console.log("Razorpay failed ❌");
      resolve(false);
    };

    document.body.appendChild(script);
  });
};

// Razorpay payment handler
export const openRazorpay = async (order, userInfo, onSuccess, onFailure) => {

  const isLoaded = await loadRazorpayScript();

  if (!isLoaded) {
    onFailure && onFailure("Payment system failed to load");
    return;
  }

  const options = {
    key: order.key,
    amount: order.amount,
    currency: order.currency,
    name: 'SportVibe',
    description: 'Tournament Registration',
    order_id: order.id,
    prefill: userInfo,
    theme: { color: '#3d8ef0' },

    handler: (response) => {
      console.log("Payment success:", response);
      onSuccess(response);
    },

    modal: {
      ondismiss: () => onFailure && onFailure('Payment cancelled')
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on('payment.failed', (res) => {
    console.log("Payment failed:", res);
    onFailure && onFailure(res.error?.description);
  });

  rzp.open();
};