import { BlobAvatar } from "./BlobAvatar";

interface MascotStageProps {
  color?: string;
  variant?: number;
  size?: number;
}

/** Big bean on a podium — Fall Guys lobby energy. */
export function MascotStage({
  color = "#FF5BA6",
  variant = 0,
  size = 96,
}: MascotStageProps) {
  return (
    <div className="mascot-stage">
      <div className="mascot-stage__rings" aria-hidden />
      <div className="mascot-stage__pedestal" aria-hidden />
      <div className="mascot-stage__bean">
        <BlobAvatar color={color} variant={variant} size={size} />
      </div>
    </div>
  );
}
