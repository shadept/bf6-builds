import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './index';

const meta: Meta<typeof Badge> = {
  title: 'BF6 UI/Primitives/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['default','secondary','destructive','outline','meta'] },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;
export const Default: Story = { args: { children: 'Badge' } };
