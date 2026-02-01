import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { createGame } from "../services/gameApi";

const { Title, Paragraph, Text } = Typography;

function genUserId(): string {
    // 浏览器支持则使用 UUID；不支持则退化为时间戳+随机数
    const anyCrypto = (globalThis as any).crypto;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
    return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
    const navigate = useNavigate();
    const [creating, setCreating] = useState(false);

    const defaultUserId = useMemo(() => genUserId(), []);
    const [form] = Form.useForm<{ gameId: string; userId: string }>();

    async function onCreate() {
        try {
            setCreating(true);

            const userId = defaultUserId;

            // 关键：后端 /game/start 需要 StartReq（至少 userId），否则 422 :contentReference[oaicite:13]{index=13}
            const res = await createGame({ userId });

            message.success("已创建对局");
            navigate(
                `/game/${encodeURIComponent(res.gameId)}?userId=${encodeURIComponent(userId)}`
            );
        } catch (e: any) {
            message.error(e.message || "创建失败");
        } finally {
            setCreating(false);
        }
    }

    function onJoin(values: { gameId: string; userId: string }) {
        const gameId = values.gameId?.trim();
        const userId = values.userId?.trim();
        if (!gameId || !userId) {
            message.warning("请填写 gameId 与 userId");
            return;
        }
        navigate(`/game/${encodeURIComponent(gameId)}?userId=${encodeURIComponent(userId)}`);
    }

    return (
        <Card>
            <Title level={3} style={{ marginTop: 0 }}>
                开始游戏
            </Title>

            <Paragraph>
                当前后端采用 ApiResponse 包装，创建对局接口为 <Text className="mono">POST /game/start</Text>，
                需要请求体包含 <Text className="mono">userId</Text>。本页会为你自动生成 userId。
            </Paragraph>

            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card type="inner" title="创建新对局">
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        <Text type="secondary">
                            当前将使用自动生成的 userId：<Text className="mono">{defaultUserId}</Text>
                        </Text>
                        <Button type="primary" loading={creating} onClick={onCreate}>
                            创建并进入
                        </Button>
                    </Space>
                </Card>

                <Card type="inner" title="加入已有对局">
                    <Form form={form} layout="vertical" onFinish={onJoin}>
                        <Form.Item
                            label="gameId"
                            name="gameId"
                            rules={[{ required: true, message: "请输入 gameId" }]}
                        >
                            <Input placeholder="例如：a1b2c3..." className="mono" />
                        </Form.Item>

                        <Form.Item
                            label="userId"
                            name="userId"
                            rules={[{ required: true, message: "请输入 userId" }]}
                            initialValue={defaultUserId}
                        >
                            <Input placeholder="例如：u123..." className="mono" />
                        </Form.Item>

                        <Button type="default" htmlType="submit">
                            进入对局
                        </Button>
                    </Form>
                </Card>

                <Text type="secondary">
                    如需修改后端地址：在项目根目录新增 <Text className="mono">.env</Text>，写入{" "}
                    <Text className="mono">VITE_API_BASE_URL=http://127.0.0.1:8000</Text>。
                    如果后端没有 /api 前缀，请再加：<Text className="mono">VITE_API_PREFIX=</Text>（空值）。
                </Text>
            </Space>
        </Card>
    );
}
