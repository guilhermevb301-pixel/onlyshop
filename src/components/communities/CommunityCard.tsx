import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Crown, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Gradient covers by theme
const THEME_COVERS: Record<string, string> = {
  affiliates: "linear-gradient(135deg, hsl(160 84% 39%), hsl(140 70% 45%))",
  "hot-products": "linear-gradient(135deg, hsl(25 95% 53%), hsl(330 81% 60%))",
  "live-commerce": "linear-gradient(135deg, hsl(270 91% 65%), hsl(330 81% 60%))",
  scale: "linear-gradient(135deg, hsl(45 93% 47%), hsl(25 95% 53%))",
  b2b: "linear-gradient(135deg, hsl(220 14% 46%), hsl(224 20% 16%))",
  default: "linear-gradient(135deg, hsl(330 81% 60%), hsl(270 91% 65%))",
};

interface CommunityCardProps {
  community: {
    id: string;
    name: string;
    description: string | null;
    cover_url: string | null;
    members_count: number;
    creator_id: string;
    theme: string | null;
    isMember?: boolean;
    creator?: {
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
  onJoinLeave: (communityId: string, isMember: boolean) => Promise<void>;
}

function getStatusTag(count: number): { label: string; icon: typeof TrendingUp } | null {
  if (count >= 100) return { label: "Popular", icon: TrendingUp };
  if (count >= 10) return { label: "Em alta", icon: Sparkles };
  return null;
}

export function CommunityCard({ community, onJoinLeave }: CommunityCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const tag = getStatusTag(community.members_count);
  const coverBg = community.cover_url
    ? undefined
    : THEME_COVERS[community.theme || "default"] || THEME_COVERS.default;

  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onJoinLeave(community.id, !!community.isMember);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/communities/${community.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "rounded-2xl border border-border overflow-hidden bg-card dark:bg-white/[0.03] dark:backdrop-blur-2xl dark:border-white/[0.08] transition-all duration-200 animate-fade-in",
        "cursor-pointer active:scale-[0.98]"
      )}
    >
      {/* Cover */}
      <div
        className="h-28 bg-cover bg-center relative"
        style={
          community.cover_url
            ? { backgroundImage: `url(${community.cover_url})` }
            : { background: coverBg }
        }
      >
        {tag && (
          <Badge
            variant="secondary"
            className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-foreground text-[10px] font-semibold"
          >
            <tag.icon className="h-3 w-3 mr-1" />
            {tag.label}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] leading-tight truncate">
              {community.name}
            </h3>
            {community.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-snug">
                {community.description}
              </p>
            )}
          </div>

          <Button
            variant={community.isMember ? "outline" : "default"}
            size="sm"
            className={cn(
              "shrink-0 rounded-full h-8 px-4 text-xs font-semibold",
              !community.isMember && "bg-gradient-primary hover:opacity-90 border-0"
            )}
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : community.isMember ? (
              "Membro"
            ) : (
              "Entrar"
            )}
          </Button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {community.members_count.toLocaleString()} membros
          </span>
          {community.creator && (
            <span className="flex items-center gap-1">
              <Crown className="h-3.5 w-3.5" />
              @{community.creator.username}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
