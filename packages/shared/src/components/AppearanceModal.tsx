import { useState } from "react";
import { Button, ColorPicker, Tooltip } from "antd";
import { BgColorsOutlined, CheckOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../store";
import { resetTheme, setAccent, setBackground } from "../theme/themeSlice";
import { accentOptions, backgroundPresets } from "../theme/presets";
import Modal from "./Modal";

/** Button + modal where users pick background and accent color. */
export function AppearanceButton({ label }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();

  const { background, accent } = useAppSelector((s) => s.theme);

  const isPresetAccent = accentOptions.includes(accent);

  return (
    <>
      <Tooltip title={label ? undefined : "Appearance"}>
        <Button
          type="text"
          shape={label ? "default" : "circle"}
          icon={<BgColorsOutlined />}
          onClick={() => setOpen(true)}
          aria-label="Appearance"
        >
          {label}
        </Button>
      </Tooltip>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        align="right"
        title="Appearance"
        description="Make it look the way you like."
        icon={<BgColorsOutlined />}
        footer={
          <Button onClick={() => dispatch(resetTheme())}>
            Reset to default
          </Button>
        }
      >
        <section className="mb-6">
          <h4 className="mb-3 text-sm font-semibold text-content">
            Background
          </h4>

          <div className="flex flex-wrap gap-3">
            {backgroundPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                aria-label={p.label}
                aria-pressed={background === p.id}
                onClick={() => dispatch(setBackground(p.id))}
                className="h-12 w-16 overflow-hidden rounded-lg border-2 p-0 transition"
                style={{
                  background: p.page,
                  borderColor:
                    background === p.id ? accent : "transparent",
                  boxShadow: `inset 0 0 0 1px ${p.line}`,
                }}
              >
                <div
                  className="ml-2 mt-2 h-8 rounded-l-md"
                  style={{
                    background: p.surface,
                    borderLeft: `1px solid ${p.line}`,
                  }}
                >
                  <div
                    className="ml-2 mt-2 h-1.5 w-7 rounded"
                    style={{
                      background: p.muted,
                      opacity: 0.6,
                    }}
                  />
                  <div
                    className="ml-2 mt-1.5 h-1.5 w-5 rounded"
                    style={{
                      background: p.muted,
                      opacity: 0.4,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-sm font-semibold text-content">
            Accent color
          </h4>

          <div className="flex flex-wrap gap-3">
            {accentOptions.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Accent ${c}`}
                aria-pressed={accent === c}
                onClick={() => dispatch(setAccent(c))}
                className="grid h-8 w-8 place-items-center rounded-full text-white"
                style={{ background: c }}
              >
                {accent === c && <CheckOutlined />}
              </button>
            ))}

            {/* Custom color */}
            <ColorPicker
              value={isPresetAccent ? undefined : accent}
              onChange={(color) => {
                dispatch(setAccent(color.toHexString()));
              }}
              size="middle"
              showText={false}
            >
              <button
                type="button"
                aria-label="Custom accent color"
                title="Custom color"
                className="grid h-8 w-8 place-items-center rounded-full border border-gray-300"
                style={{
                  background: isPresetAccent ? undefined : accent,
                }}
              >
                {isPresetAccent ? (
                  <span className="text-lg leading-none">+</span>
                ) : (
                  <CheckOutlined className="text-white" />
                )}
              </button>
            </ColorPicker>
          </div>
        </section>
      </Modal>
    </>
  );
}