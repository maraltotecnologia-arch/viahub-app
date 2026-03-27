const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  VIP:         { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B", border: "rgba(245,158,11,0.4)"  },
  Corporativo: { bg: "rgba(37,99,235,0.15)",   text: "#60A5FA", border: "rgba(37,99,235,0.4)"   },
  Eventual:    { bg: "rgba(100,116,139,0.15)", text: "#94A3B8", border: "rgba(100,116,139,0.4)" },
  Recorrente:  { bg: "rgba(34,197,94,0.15)",   text: "#4ADE80", border: "rgba(34,197,94,0.4)"   },
  Inativo:     { bg: "rgba(239,68,68,0.15)",   text: "#FCA5A5", border: "rgba(239,68,68,0.4)"   },
  Prospect:    { bg: "rgba(139,92,246,0.15)",  text: "#C4B5FD", border: "rgba(139,92,246,0.4)"  },
  // CRM tags
  "Família":    { bg: "rgba(236,72,153,0.15)",  text: "#F472B6", border: "rgba(236,72,153,0.4)"  },
  Casal:        { bg: "rgba(239,68,68,0.15)",   text: "#FCA5A5", border: "rgba(239,68,68,0.4)"   },
  Aventura:     { bg: "rgba(34,197,94,0.15)",   text: "#4ADE80", border: "rgba(34,197,94,0.4)"   },
  Idosos:       { bg: "rgba(100,116,139,0.15)", text: "#94A3B8", border: "rgba(100,116,139,0.4)" },
  Pet:          { bg: "rgba(251,146,60,0.15)",  text: "#FB923C", border: "rgba(251,146,60,0.4)"  },
  "Lua de mel": { bg: "rgba(245,158,11,0.15)",  text: "#FBBF24", border: "rgba(245,158,11,0.4)"  },
};

interface ClienteTagBadgesProps {
  tags: string[];
}

export default function ClienteTagBadges({ tags }: ClienteTagBadgesProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        const colors = tagColors[tag] || tagColors.Eventual;
        return (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              borderColor: colors.border,
            }}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}
