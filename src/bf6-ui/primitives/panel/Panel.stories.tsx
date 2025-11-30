import type { Meta, StoryObj } from '@storybook/react'
import { Panel } from './index'

const meta: Meta<typeof Panel> = {
  title: 'BF6 UI/Primitives/Panel',
  component: Panel,
  argTypes: {
    variant: { control: 'select', options: ['default','destructive','accent','subtle'] },
    className: { control: 'text' }
  }
};
export default meta;

type Story = StoryObj<typeof Panel>;

export const Default: Story = {
  args: { variant: 'default' },
  render: (args) => (
    <Panel {...args} className={args.className || "p-4 text-slate-300"}>
      This is a BF6 Panel
    </Panel>
  )
};