import { Composition, Folder } from "remotion";
import { BelosPave, T } from "./Video";
import { Hook } from "./Hook";
import { BeforeAfter } from "./BeforeAfter";
import { Showcase } from "./Showcase";
import { Colors } from "./Colors";
import { Cta } from "./Cta";

const size = { fps: 30, width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BelosPave"
        component={BelosPave}
        durationInFrames={T.end}
        {...size}
      />
      <Folder name="Cenas">
        <Composition
          id="Abertura"
          component={Hook}
          durationInFrames={T.ad - T.hook}
          {...size}
        />
        <Composition
          id="AntesDepois"
          component={BeforeAfter}
          durationInFrames={T.show - T.ad}
          {...size}
        />
        <Composition
          id="Modelos"
          component={Showcase}
          durationInFrames={T.colors - T.show}
          {...size}
        />
        <Composition
          id="Cores"
          component={Colors}
          durationInFrames={T.cta - T.colors}
          {...size}
        />
        <Composition
          id="Contacto"
          component={Cta}
          durationInFrames={T.end - T.cta}
          {...size}
        />
      </Folder>
    </>
  );
};
