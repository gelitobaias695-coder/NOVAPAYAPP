export interface Product {
  id: string;
  name: string;
  description: string;
  priceBase: number;
  productType: "digital" | "physical";
  fileUrl?: string;
  stock?: number;
  weight?: number;
  active: boolean;
  image?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  country: string;
  currency: string;
  totalAmount: number;
  paymentStatus: "pending" | "success" | "failed";
  paymentReference: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmContent?: string;
  createdAt: string;
  productName: string;
}

export interface AbandonedCart {
  id: string;
  email: string;
  productId: string;
  productName: string;
  country: string;
  currency: string;
  createdAt: string;
}

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "E-commerce Mastery Course",
    description: "Complete guide to building a profitable online store in Africa",
    priceBase: 499,
    productType: "digital",
    fileUrl: "/downloads/course.zip",
    active: true,
  },
  {
    id: "2",
    name: "Business Plan Template Pack",
    description: "50+ professional business plan templates for African entrepreneurs",
    priceBase: 199,
    productType: "digital",
    fileUrl: "/downloads/templates.zip",
    active: true,
  },
  {
    id: "3",
    name: "Wireless Earbuds Pro",
    description: "Premium wireless earbuds with noise cancellation",
    priceBase: 899,
    productType: "physical",
    stock: 150,
    weight: 0.2,
    active: true,
  },
  {
    id: "4",
    name: "Smart Watch Elite",
    description: "Fitness tracker with heart rate monitor and GPS",
    priceBase: 1299,
    productType: "physical",
    stock: 75,
    weight: 0.15,
    active: true,
  },
  {
    id: "5",
    name: "Social Media Marketing Toolkit",
    description: "Templates, guides, and tools for social media growth",
    priceBase: 349,
    productType: "digital",
    fileUrl: "/downloads/smm-toolkit.zip",
    active: false,
  },
];

export const mockOrders: Order[] = [
  { id: "ORD-001", customerName: "Amina Osei", customerEmail: "amina@email.com", customerPhone: "+233551234567", country: "GH", currency: "GHS", totalAmount: 349.30, paymentStatus: "success", paymentReference: "PAY_ref001", utmSource: "facebook", utmCampaign: "summer_sale", utmMedium: "cpc", createdAt: "2026-02-22T10:30:00Z", productName: "E-commerce Mastery Course" },
  { id: "ORD-002", customerName: "Chidi Nwosu", customerEmail: "chidi@email.com", customerPhone: "+2348012345678", country: "NG", currency: "NGN", totalAmount: 42415, paymentStatus: "success", paymentReference: "PAY_ref002", utmSource: "google", utmCampaign: "brand", utmMedium: "cpc", createdAt: "2026-02-22T09:15:00Z", productName: "Business Plan Template Pack" },
  { id: "ORD-003", customerName: "Wanjiku Mwangi", customerEmail: "wanjiku@email.com", customerPhone: "+254712345678", country: "KE", currency: "KES", totalAmount: 6742.50, paymentStatus: "success", paymentReference: "PAY_ref003", createdAt: "2026-02-21T14:20:00Z", productName: "Wireless Earbuds Pro" },
  { id: "ORD-004", customerName: "Sipho Dlamini", customerEmail: "sipho@email.com", customerPhone: "+27821234567", country: "ZA", currency: "ZAR", totalAmount: 1299, paymentStatus: "pending", paymentReference: "PAY_ref004", utmSource: "instagram", utmMedium: "social", createdAt: "2026-02-21T11:45:00Z", productName: "Smart Watch Elite" },
  { id: "ORD-005", customerName: "Fatima Hassan", customerEmail: "fatima@email.com", customerPhone: "+255712345678", country: "TZ", currency: "TZS", totalAmount: 69860, paymentStatus: "success", paymentReference: "PAY_ref005", utmSource: "tiktok", utmCampaign: "viral", utmMedium: "social", createdAt: "2026-02-20T16:30:00Z", productName: "E-commerce Mastery Course" },
  { id: "ORD-006", customerName: "Kofi Mensah", customerEmail: "kofi@email.com", customerPhone: "+233241234567", country: "GH", currency: "GHS", totalAmount: 139.30, paymentStatus: "success", paymentReference: "PAY_ref006", utmSource: "facebook", utmCampaign: "retargeting", utmMedium: "cpc", createdAt: "2026-02-20T08:00:00Z", productName: "Business Plan Template Pack" },
  { id: "ORD-007", customerName: "Blessing Eze", customerEmail: "blessing@email.com", customerPhone: "+2349012345678", country: "NG", currency: "NGN", totalAmount: 76415, paymentStatus: "failed", paymentReference: "PAY_ref007", createdAt: "2026-02-19T20:10:00Z", productName: "Wireless Earbuds Pro" },
];

export const mockAbandonedCarts: AbandonedCart[] = [
  { id: "AC-001", email: "john@email.com", productId: "1", productName: "E-commerce Mastery Course", country: "NG", currency: "NGN", createdAt: "2026-02-22T08:30:00Z" },
  { id: "AC-002", email: "sarah@email.com", productId: "3", productName: "Wireless Earbuds Pro", country: "KE", currency: "KES", createdAt: "2026-02-21T15:00:00Z" },
  { id: "AC-003", email: "david@email.com", productId: "2", productName: "Business Plan Template Pack", country: "GH", currency: "GHS", createdAt: "2026-02-21T12:45:00Z" },
];

export const revenueByDay = [
  { date: "Seg", revenue: 0, orders: 0 },
  { date: "Ter", revenue: 0, orders: 0 },
  { date: "Qua", revenue: 0, orders: 0 },
  { date: "Qui", revenue: 0, orders: 0 },
  { date: "Sex", revenue: 0, orders: 0 },
  { date: "Sáb", revenue: 0, orders: 0 },
  { date: "Dom", revenue: 0, orders: 0 },
];

export interface CheckoutTemplate {
  id: string;
  name: string;
  slug: string;
  productId: string;
  type: "digital" | "physical";
  currency: "ZAR" | "NGN" | "GHS" | "KES" | "TZS";
  price: number;
  primaryColor: string;
  buttonColor: string;
  logoUrl: string;
  showTimer: boolean;
  showTestimonials: boolean;
  showSecurityBadge: boolean;
  guaranteeText: string;
  createdAt: string;
}

export const mockCheckoutTemplates: CheckoutTemplate[] = [
  {
    id: "ct-001",
    name: "Curso E-commerce ZA",
    slug: "curso-ecommerce-za",
    productId: "1",
    type: "digital",
    currency: "ZAR",
    price: 499,
    primaryColor: "#10B981",
    buttonColor: "#10B981",
    logoUrl: "",
    showTimer: true,
    showTestimonials: true,
    showSecurityBadge: true,
    guaranteeText: "Garantia de 7 dias — 100% do dinheiro de volta",
    createdAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "ct-002",
    name: "Earbuds Nigeria",
    slug: "earbuds-ng",
    productId: "3",
    type: "physical",
    currency: "NGN",
    price: 76415,
    primaryColor: "#10B981",
    buttonColor: "#10B981",
    logoUrl: "",
    showTimer: true,
    showTestimonials: true,
    showSecurityBadge: true,
    guaranteeText: "7-day money back guarantee",
    createdAt: "2026-02-21T14:00:00Z",
  },
];

export const revenueByCountry = [
  { country: "Nigeria", value: 0, flag: "🇳🇬" },
  { country: "South Africa", value: 0, flag: "🇿🇦" },
  { country: "Kenya", value: 0, flag: "🇰🇪" },
  { country: "Ghana", value: 0, flag: "🇬🇭" },
  { country: "Tanzania", value: 0, flag: "🇹🇿" },
];
