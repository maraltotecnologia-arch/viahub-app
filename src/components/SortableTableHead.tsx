import { TableHead } from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface SortableTableHeadProps {
  label: string;
  field: string;
  currentField: string;
  currentDirection: "asc" | "desc";
  defaultField: string;
  onSort: (field: string, direction: "asc" | "desc") => void;
  className?: string;
}

export default function SortableTableHead({
  label,
  field,
  currentField,
  currentDirection,
  defaultField,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentField === field;

  const handleClick = () => {
    if (!isActive) {
      onSort(field, "asc");
    } else if (currentDirection === "asc") {
      onSort(field, "desc");
    } else {
      // reset to default
      onSort(defaultField, "desc");
    }
  };

  return (
    <TableHead
      className={`cursor-pointer select-none ${isActive ? "text-blue-600" : ""} ${className || ""}`}
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {!isActive && <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
        {isActive && currentDirection === "asc" && <ChevronUp className="h-3.5 w-3.5" />}
        {isActive && currentDirection === "desc" && <ChevronDown className="h-3.5 w-3.5" />}
      </span>
    </TableHead>
  );
}
