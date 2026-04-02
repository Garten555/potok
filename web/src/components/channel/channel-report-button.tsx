"use client";

import { ReportDialog } from "@/components/report/report-dialog";

type ChannelReportButtonProps = {
  channelUserId: string;
};

export function ChannelReportButton({ channelUserId }: ChannelReportButtonProps) {
  return <ReportDialog targetType="channel" targetId={channelUserId} label="Пожаловаться на канал" />;
}
