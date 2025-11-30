import type { Meta, StoryObj } from '@storybook/react'
import { Text } from './Text'

const meta: Meta<typeof Text> = {
  title: 'BF6 UI/Primitives/Text',
  component: Text,
  argTypes: {
    variant: {
      control: 'select',
      options: ['md', 'sm', 'xs', 'muted', 'danger', 'accent']
    },
    children: { control: 'text' }
  }
}

export default meta

type Story = StoryObj<typeof Text>

export const Default: Story = {
  args: {
    variant: 'md',
    children: 'This is sample body text rendered with BF6Text.'
  }
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-2">
      <Text variant="md">Default Text (md)</Text>
      <Text variant="sm">Small Text (sm)</Text>
      <Text variant="xs">Extra Small Text (xs)</Text>
      <Text variant="muted">Muted Text (muted)</Text>
      <Text variant="danger">Danger Text (danger)</Text>
      <Text variant="accent">Accent Text (accent)</Text>
    </div>
  )
}