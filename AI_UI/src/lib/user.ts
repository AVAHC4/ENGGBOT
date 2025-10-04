export type CurrentUser = {
  email: string
  name: string
  avatar: string
}

export function getCurrentUser(): CurrentUser {
  if (typeof window === 'undefined') {
    return { email: 'user@example.com', name: 'User', avatar: '' }
  }
  try {
    const userDataRaw = localStorage.getItem('user_data')
    if (userDataRaw) {
      const u = JSON.parse(userDataRaw)
      return {
        email: u.email || 'user@example.com',
        name: u.name || 'User',
        avatar: u.avatar || '',
      }
    }
    const email = localStorage.getItem('user_email') || 'user@example.com'
    const name = localStorage.getItem('user_name') || 'User'
    const avatar = localStorage.getItem('user_avatar') || ''
    return { email, name, avatar }
  } catch {
    return { email: 'user@example.com', name: 'User', avatar: '' }
  }
}
