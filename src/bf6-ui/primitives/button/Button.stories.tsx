import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './index';

const meta: Meta<typeof Button> = {
  title: 'BF6 UI/Primitives/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['default','destructive','outline','secondary','ghost','link'] },
    size: { control: 'select', options: ['default','sm','lg','icon'] },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};
