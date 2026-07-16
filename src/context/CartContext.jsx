import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('se_cart')
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item === 'object' && item.slug)
      .map((item) => ({
        name: item.name || item.slug,
        slug: item.slug,
        price: item.price || '',
        image: item.image || '/assets/img/shop/shop1.png',
        quantity: Math.max(1, Number(item.quantity) || 1),
      }))
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(loadCartFromStorage)
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('se_cart', JSON.stringify(cartItems))
  }, [cartItems])

  const addToCart = (product, quantity = 1) => {
    const qty = Math.max(1, Number(quantity) || 1)
    setCartItems((prevItems) => {
      const existingIdx = prevItems.findIndex((item) => item.slug === product.slug)
      if (existingIdx > -1) {
        return prevItems.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      }
      return [
        ...prevItems,
        {
          name: product.name,
          slug: product.slug,
          price: product.price,
          image: product.images && product.images.length > 0 ? product.images[0] : '/assets/img/shop/shop1.png',
          quantity: qty,
        },
      ]
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (slug) => {
    setCartItems((prev) => prev.filter((item) => item.slug !== slug))
  }

  const updateQuantity = (slug, quantity) => {
    if (quantity <= 0) {
      removeFromCart(slug)
      return
    }
    setCartItems((prev) =>
      prev.map((item) => (item.slug === slug ? { ...item, quantity } : item))
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        totalItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
