import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Receipt, 
  Menu
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const AppBottomNav = () => {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [cartCount, setCartCount] = useState(0);

  const updateCartCount = () => {
    try {
      const raw = localStorage.getItem('pos_cart');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const total = parsed.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          setCartCount(total);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse pos_cart count in AppBottomNav:", e);
    }
    setCartCount(0);
  };

  useEffect(() => {
    // Initial count fetch
    updateCartCount();

    // Listen to custom local storage storage updates from POS page
    window.addEventListener("pos-cart-updated", updateCartCount);
    window.addEventListener("storage", updateCartCount); // Fallback for multi-tab
    
    return () => {
      window.removeEventListener("pos-cart-updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  const navItems = [
    { title: "Beranda", url: "/dashboard", icon: Home },
    { title: "Kasir", url: "/pos", icon: ShoppingCart },
    { title: "Produk", url: "/products", icon: Package },
    { title: "Transaksi", url: "/transactions", icon: Receipt },
    { title: "Menu", url: "#", icon: Menu, isMenuTrigger: true },
  ];

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-[9999] w-full max-w-full overflow-hidden bg-background/95 backdrop-blur-md border-t border-border/80 safe-area-inset-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.1)] select-none">
      <div className="grid grid-cols-5 h-14 sm:h-16 w-full max-w-full overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.url;

          if (item.isMenuTrigger) {
            return (
              <button
                key="sidebar-trigger"
                onClick={toggleSidebar}
                className="flex flex-col items-center justify-center gap-0.5 w-full text-muted-foreground hover:text-primary transition-colors px-0.5 overflow-hidden"
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-medium truncate max-w-full">{item.title}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={(e) => {
                if (item.title === "Kasir") {
                  if (location.pathname === "/pos") {
                    e.preventDefault(); // Prevent route reload if already on the POS page
                    if (cartCount > 0) {
                      const cartElement = document.getElementById("pos-cart-section");
                      if (cartElement) {
                        cartElement.scrollIntoView({ behavior: "smooth" });
                      }
                    } else {
                      // Scroll to top if cart is empty and clicked on active tab
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  } else {
                    // If navigating from another page, scroll down only if there are items in cart
                    if (cartCount > 0) {
                      setTimeout(() => {
                        const cartElement = document.getElementById("pos-cart-section");
                        if (cartElement) {
                          cartElement.scrollIntoView({ behavior: "smooth" });
                        }
                      }, 250);
                    }
                  }
                }
              }}
              className={({ isActive }) => 
                cn(
                  "flex flex-col items-center justify-center gap-0.5 w-full transition-colors relative px-0.5 overflow-hidden",
                  isActive 
                    ? "text-primary font-bold" 
                    : "text-muted-foreground hover:text-primary"
                )
              }
            >
              <div className="relative p-0.5">
                <Icon className={cn("w-5 h-5 shrink-0", isActive && "stroke-[2.5px]")} />
                {item.title === "Kasir" && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center animate-pulse transition-all">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium truncate max-w-full">{item.title}</span>
              {isActive && (
                <span className="absolute bottom-0.5 w-1 h-1 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default AppBottomNav;
