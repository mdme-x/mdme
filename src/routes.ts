import {
  route,
  type RouteConfig,
} from '@react-router/dev/routes'

export default [
  route('/', './pages/index.tsx'),
  route('/settings', './pages/settings/index.tsx'),
  route('*?', './pages/404.tsx'),
] satisfies RouteConfig
