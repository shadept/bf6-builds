import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './index';

const meta: Meta<typeof Slider> = {
  title: 'BF6 UI/Primitives/Slider',
  component: Slider,
  argTypes: {
    defaultValue: { control: 'object' },
    max: { control: 'number' },
    step: { control: 'number' },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Slider>;
export const Default: Story = {
  args: { defaultValue: [50], max: 100, step: 1 }
};
