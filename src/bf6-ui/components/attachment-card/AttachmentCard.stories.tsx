import type { Meta, StoryObj } from '@storybook/react'
import { AttachmentCard } from './index'

const meta: Meta<typeof AttachmentCard> = {
  title: 'BF6 UI/Components/AttachmentCard',
  component: AttachmentCard,
  argTypes: {
    status: { control: 'select', options: ['active','new','removed'] }
  }
};
export default meta;

type Story = StoryObj<typeof AttachmentCard>

export const Default: Story = {
  args: {
    name: 'High Power Barrel',
    description: 'Improves effective range and bullet velocity.',
    slot: 'Barrel',
    points: 6,
    unlockLevel: 14,
    status: 'active'
  }
}

export const Removed: Story = {
  args: {
    name: 'Extended Mag',
    description: 'Increases magazine size at the cost of reload time.',
    slot: 'Magazine',
    points: 4,
    unlockLevel: 10,
    status: 'removed'
  }
}

export const NewlyAdded: Story = {
  args: {
    name: 'Reflex Sight',
    description: 'Provides a clearer aiming point with minimal obstruction.',
    slot: 'Optic',
    points: 3,
    unlockLevel: 5,
    status: 'new'
  }
}