import { Modal, message } from "antd";
import type { NonogramPuzzle } from "../../games/nonogram/types";
import { createShareLink } from "../../services/nonogramShareApi";

type Props = { puzzle: NonogramPuzzle; disabled?: boolean };

export default function NonogramShareButton({ puzzle, disabled }: Props) {
  async function share() {
    try {
      const url = await createShareLink(puzzle);
      try {
        await navigator.clipboard.writeText(url);
        message.success("分享链接已复制");
      } catch {
        Modal.info({
          title: "分享链接",
          content: <input className="nonogram-share-link" value={url} readOnly onFocus={event => event.currentTarget.select()} />,
        });
      }
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : "创建分享链接失败");
    }
  }

  return <button className="nonogram-battle-entry" type="button" disabled={disabled} onClick={() => void share()}>分享题目</button>;
}
