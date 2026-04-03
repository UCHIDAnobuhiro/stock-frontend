"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSymbols } from "@/hooks/useSymbols";
import { useWatchlist } from "@/hooks/useWatchlist";

export function WatchlistAddButton() {
  const [open, setOpen] = useState(false);
  const { symbols, isLoading } = useSymbols();
  const { items, addSymbol } = useWatchlist();

  const watchedCodes = new Set(items.map((i) => i.symbol_code));

  const handleSelect = async (code: string) => {
    setOpen(false);
    await addSymbol(code);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex w-full items-center justify-start gap-1.5 h-8 px-3 text-xs rounded-md hover:bg-[var(--color-surface-3)] transition-colors"
        style={{ color: "var(--color-text-muted)" }}
      >
        <Plus className="h-3.5 w-3.5" />
        銘柄を追加
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        style={{
          backgroundColor: "var(--color-surface-2)",
          borderColor: "var(--color-border)",
        }}
        align="start"
      >
        <Command
          style={{ backgroundColor: "transparent" }}
        >
          <CommandInput
            placeholder="銘柄コード・企業名で検索..."
            className="text-xs"
            style={{ color: "var(--color-text-primary)" }}
          />
          <CommandList>
            {isLoading ? (
              <div
                className="py-4 text-center text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                読み込み中...
              </div>
            ) : (
              <>
                <CommandEmpty
                  style={{ color: "var(--color-text-muted)" }}
                >
                  銘柄が見つかりません
                </CommandEmpty>
                <CommandGroup>
                  {symbols
                    .filter((s) => !watchedCodes.has(s.code))
                    .map((symbol) => (
                      <CommandItem
                        key={symbol.code}
                        value={`${symbol.code} ${symbol.name}`}
                        onSelect={() => handleSelect(symbol.code)}
                        className="gap-2 text-xs cursor-pointer"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        <span className="font-medium">{symbol.code}</span>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {symbol.name}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
