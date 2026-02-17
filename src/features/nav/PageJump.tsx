import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

type PageJumpProps = {
  currentPage: number;
  totalPages: number;
  onJump: (page: number) => void;
};

export function PageJump({ currentPage, totalPages, onJump }: PageJumpProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const next = Number(value);
    if (!value.trim() || Number.isNaN(next) || !Number.isInteger(next)) {
      setError("整数のページ番号を入力してください");
      return;
    }

    if (next < 1 || next > totalPages) {
      setError(`1 〜 ${totalPages} の範囲で入力してください`);
      return;
    }

    setError(null);
    onJump(next);
    setValue("");
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">ページジャンプ</h3>
      <p className="text-xs text-muted-foreground">現在: {currentPage}</p>
      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          placeholder={`1-${totalPages}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submit();
            }
          }}
        />
        <Button onClick={submit}>移動</Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
