import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, Check, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface Outlet {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_main: boolean | number;
  is_active: boolean | number;
}

export const OutletSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [activeOutlet, setActiveOutlet] = useState<Outlet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOutlets = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/outlets");
      const list: Outlet[] = res.data || [];
      setOutlets(list);

      // Determine active outlet
      const savedId = localStorage.getItem("active_outlet_id");
      let current = list.find((o) => o.id === savedId);

      if (!current && list.length > 0) {
        // Default to main outlet or first outlet
        current = list.find((o) => !!o.is_main) || list[0];
      }

      if (current) {
        setActiveOutlet(current);
        localStorage.setItem("active_outlet_id", current.id);
        localStorage.setItem("active_outlet_name", current.name);
      }
    } catch (error) {
      console.error("Error fetching outlets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const handleSelectOutlet = (outlet: Outlet) => {
    setActiveOutlet(outlet);
    localStorage.setItem("active_outlet_id", outlet.id);
    localStorage.setItem("active_outlet_name", outlet.name);
    toast.success(`Cabang Aktif: ${outlet.name}`);

    // Dispatch custom event so pages can listen and refresh data
    window.dispatchEvent(new CustomEvent("outlet_changed", { detail: outlet }));
  };

  if (outlets.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs font-semibold bg-background/80 hover:bg-accent border-primary/30 text-foreground gap-1.5 shadow-2xs"
        >
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="max-w-[120px] sm:max-w-[160px] truncate font-bold">
            {activeOutlet ? activeOutlet.name : "Pilih Cabang"}
          </span>
          {activeOutlet && !!activeOutlet.is_main && (
            <Badge className="hidden md:inline-flex bg-primary/20 text-primary border-primary/30 text-[9px] px-1.5 py-0 h-4">
              Pusat
            </Badge>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center justify-between">
          <span>Pilih Cabang / Outlet</span>
          <Badge variant="outline" className="text-[9px]">
            {outlets.length} Cabang
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {outlets.map((outlet) => {
            const isSelected = activeOutlet?.id === outlet.id;
            return (
              <DropdownMenuItem
                key={outlet.id}
                onClick={() => handleSelectOutlet(outlet)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs ${
                  isSelected ? "bg-primary/10 font-bold text-primary" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Store className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="truncate">
                    <div className="truncate font-semibold">{outlet.name}</div>
                    {outlet.address && (
                      <div className="text-[10px] text-muted-foreground truncate">{outlet.address}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!!outlet.is_main && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                      Pusat
                    </Badge>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/outlets")}
          className="text-xs font-semibold text-primary flex items-center gap-2 p-2 cursor-pointer hover:bg-primary/10 rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Tambah / Kelola Cabang</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
