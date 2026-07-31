/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import type { ComponentType } from 'react'

/** Typed glob, so `resolvePageComponent` infers a component instead of unknown. */
const pages = import.meta.glob<{ default: ComponentType }>('../pages/**/*.tsx')

createInertiaApp({
  progress: { color: '#34d399' },

  title: (title) => (title ? `${title} · MyFrigo` : 'MyFrigo'),

  /** Inertia 3 wants the component itself, not the module wrapping it. */
  resolve: async (name) => (await resolvePageComponent(`../pages/${name}.tsx`, pages)).default,

  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})
