import type { Meta, StoryObj } from '@storybook/react-native';

import { TODAY_PAYMENTS } from '@/data/overview';

import { TodayPaymentsCard } from './today-payments-card';

const meta = {
  title: 'PineOne/Overview/TodayPaymentsCard',
  component: TodayPaymentsCard,
  parameters: {
    docs: {
      description: {
        component:
          'Overview card for today’s payments (Figma 6470:685): total with faded paise and the payment count, then Pine Labs and Partner Bank, a closed accordion with the channel breakdown (all channels) or the last 3 transactions (one channel), and a link to the history.',
      },
    },
  },
  args: {
    totalAmount: TODAY_PAYMENTS.totalAmount,
    count: TODAY_PAYMENTS.count,
    sources: [
      { value: 'pinelabs', label: 'Pine Labs', count: 38, amount: 1553800 },
      { value: 'partner-bank', label: 'Partner Bank', count: 10, amount: 388450 },
    ],
    recent: TODAY_PAYMENTS.recent,
  },
} satisfies Meta<typeof TodayPaymentsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithChannelShare: Story = {
  args: {
    channels: [
      { kind: 'in-store', label: 'In-store', count: 21, amount: 835168 },
      { kind: 'online', label: 'Online', count: 27, amount: 1107082 },
    ],
  },
};

export const NoPartnerBank: Story = {
  args: {
    sources: [{ value: 'pinelabs', label: 'Pine Labs', count: 48, amount: 1942250 }],
    channels: [
      { kind: 'in-store', label: 'In-store', count: 21, amount: 835168 },
      { kind: 'online', label: 'Online', count: 27, amount: 1107082 },
    ],
  },
};
