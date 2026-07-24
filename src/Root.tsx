import React from "react";
import { Composition } from "remotion";
import { PairingCard } from "./PairingCard";
import { FireflyCryptographer } from "./FireflyCryptographer";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="PairingCard"
        component={PairingCard}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="FireflyCryptographer"
        component={FireflyCryptographer}
        durationInFrames={165}
        fps={30}
        width={1080}
        height={1350}
      />
    </>
  );
};
