"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploadField } from "@/components/admin/image-upload-field"
import { ArrowLeft, Plus, Trash2, GripVertical, Search, Settings, Edit, ArrowRight } from "lucide-react"

interface Product {
    _id: string
    name: string
    price: number
    image?: string
    sku?: string
    company: { name: string }
}

interface NewArrival {
    _id: string
    productId: Product
    title: string
    image: string
    description?: string
    position: number
    addedAt: string
    originalProductId?: string // For tracking original product when editing
}

interface NewArrivalsSettings {
    isVisible: boolean
    limit: number
}

export default function NewArrivalsPage() {
    const router = useRouter()
    const params = useParams()
    const { data: session } = useSession()
    const companyId = params.id as string

    const [newArrivals, setNewArrivals] = useState<NewArrival[]>([])
    const [availableProducts, setAvailableProducts] = useState<Product[]>([])
    const [settings, setSettings] = useState<NewArrivalsSettings>({ isVisible: true, limit: 10 })
    const [loading, setLoading] = useState(true)
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [tempLimit, setTempLimit] = useState(10)
    const [draggedItem, setDraggedItem] = useState<string | null>(null)
    const [selectedArrival, setSelectedArrival] = useState<NewArrival | null>(null)

    // New arrival form state
    const [newArrivalForm, setNewArrivalForm] = useState({
        title: "",
        image: "",
        description: "",
        productId: "",
    })

    useEffect(() => {
        if (!session) {
            router.push("/auth/login")
            return
        }

        if (!companyId) return

        fetchData()
    }, [session, router, companyId])

    useEffect(() => {
        const filtered = availableProducts.filter((product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        setFilteredProducts(filtered)
    }, [searchQuery, availableProducts])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch new arrivals
            const arrivalsRes = await fetch(
                `/api/companies/${companyId}/new-arrivals?all=true`
            )
            if (!arrivalsRes.ok) throw new Error("Failed to fetch new arrivals")
            const arrivalsData = await arrivalsRes.json()
            setNewArrivals(arrivalsData.newArrivals || [])
            setSettings(arrivalsData.settings || { isVisible: true, limit: 10 })
            setTempLimit(arrivalsData.settings?.limit || 10)

            // Fetch available products for this company
            const productsRes = await fetch(`/api/products?company=${companyId}`)
            if (!productsRes.ok) throw new Error("Failed to fetch products")
            const productsData = await productsRes.json()
            const products = Array.isArray(productsData) ? productsData : productsData.products || []
            setAvailableProducts(products)
        } catch (error) {
            console.error("Error fetching data:", error)
            alert("Failed to load data")
        } finally {
            setLoading(false)
        }
    }

    const handleAddProduct = async () => {
        if (!newArrivalForm.productId || !newArrivalForm.title || !newArrivalForm.image) {
            alert("Please fill in product, title, and image")
            return
        }

        try {
            const res = await fetch(`/api/companies/${companyId}/new-arrivals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: newArrivalForm.productId,
                    title: newArrivalForm.title,
                    image: newArrivalForm.image,
                    description: newArrivalForm.description,
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to add product")
            }

            await fetchData()
            setShowAddDialog(false)
            setNewArrivalForm({ title: "", image: "", description: "", productId: "" })
            setSearchQuery("")
            alert("Product added to New Arrivals!")
        } catch (error) {
            console.error("Error adding product:", error)
            alert(error instanceof Error ? error.message : "Failed to add product")
        }
    }

    const handleEditArrival = async () => {
        if (!selectedArrival || !selectedArrival.title || !selectedArrival.image || !selectedArrival.productId) {
            alert("Please fill in all required fields")
            return
        }

        try {
            const originalProductId = (selectedArrival as any).originalProductId
            const newProductId = typeof selectedArrival.productId === "object"
                ? selectedArrival.productId._id
                : selectedArrival.productId

            // If product changed, we need to delete the old one and create a new one
            if (originalProductId !== newProductId) {
                // Delete the old new arrival
                await fetch(`/api/companies/${companyId}/new-arrivals/${originalProductId}`, {
                    method: "DELETE",
                })

                // Create new one with the new product
                const res = await fetch(`/api/companies/${companyId}/new-arrivals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productId: newProductId,
                        title: selectedArrival.title,
                        image: selectedArrival.image,
                        description: selectedArrival.description || "",
                    }),
                })

                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error || "Failed to update product")
                }
            } else {
                // Just update the existing one
                const res = await fetch(`/api/companies/${companyId}/new-arrivals/${originalProductId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: selectedArrival.title,
                        image: selectedArrival.image,
                        description: selectedArrival.description || "",
                    }),
                })

                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error || "Failed to update product")
                }
            }

            await fetchData()
            setShowEditDialog(false)
            setSelectedArrival(null)
            alert("Product updated successfully!")
        } catch (error) {
            console.error("Error updating product:", error)
            alert(error instanceof Error ? error.message : "Failed to update product")
        }
    }

    const handleOpenEditDialog = (arrival: NewArrival) => {
        // Store the original product ID separately to handle product changes
        const originalProductId = typeof arrival.productId === "object"
            ? arrival.productId._id
            : arrival.productId

        setSelectedArrival({
            ...arrival,
            originalProductId, // Store original for comparison
        })
        setShowEditDialog(true)
    }

    const handleRemoveProduct = async (arrivalId: string, productId: string) => {
        if (!confirm("Are you sure you want to remove this product?")) return

        try {
            const res = await fetch(`/api/companies/${companyId}/new-arrivals/${productId}`, {
                method: "DELETE",
            })

            if (!res.ok) throw new Error("Failed to remove product")

            await fetchData()
            alert("Product removed from New Arrivals!")
        } catch (error) {
            console.error("Error removing product:", error)
            alert("Failed to remove product")
        }
    }

    const handleUpdateSettings = async () => {
        try {
            const res = await fetch(`/api/companies/${companyId}/new-arrivals/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    isVisible: settings.isVisible,
                    limit: tempLimit,
                }),
            })

            if (!res.ok) throw new Error("Failed to update settings")

            setSettings({ ...settings, limit: tempLimit })
            setShowSettingsDialog(false)
            alert("Settings updated successfully!")
        } catch (error) {
            console.error("Error updating settings:", error)
            alert("Failed to update settings")
        }
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, arrivalId: string) => {
        setDraggedItem(arrivalId)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault()
        if (!draggedItem) return

        const draggedIndex = newArrivals.findIndex((item) => item._id === draggedItem)
        if (draggedIndex === targetIndex || draggedIndex === -1) return

        const reordered = [...newArrivals]
        const [draggedArrival] = reordered.splice(draggedIndex, 1)
        reordered.splice(targetIndex, 0, draggedArrival)

        setNewArrivals(reordered)
        setDraggedItem(null)

        // Save reorder
        try {
            const productIds = reordered.map((item) =>
                typeof item.productId === "string" ? item.productId : item.productId._id
            )

            const res = await fetch(`/api/companies/${companyId}/new-arrivals/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds }),
            })

            if (!res.ok) throw new Error("Failed to reorder")
            console.log("Products reordered successfully!")
        } catch (error) {
            console.error("Error reordering:", error)
            alert("Failed to reorder products")
            await fetchData()
        }
    }

    const toggleVisibility = async () => {
        const newVisibility = !settings.isVisible
        try {
            const res = await fetch(`/api/companies/${companyId}/new-arrivals/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    isVisible: newVisibility,
                    limit: settings.limit,
                }),
            })

            if (!res.ok) throw new Error("Failed to update visibility")

            setSettings({ ...settings, isVisible: newVisibility })
            alert(`New Arrivals section ${newVisibility ? "shown" : "hidden"}!`)
        } catch (error) {
            console.error("Error toggling visibility:", error)
            alert("Failed to update visibility")
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Loading New Arrivals...</p>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 mb-8 border border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/companies">
                                <Button variant="outline" size="sm" className="hover:bg-background">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Companies
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                                    ✨ New Arrivals
                                </h1>
                                <p className="text-muted-foreground">Manage and showcase your latest products</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                {settings.isVisible ? "Visible" : "Hidden"}
                            </div>
                            <span>•</span>
                            <span>{newArrivals.length} of {settings.limit} products</span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats & Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-700">Total Products</p>
                                    <p className="text-2xl font-bold text-blue-900">{newArrivals.length}</p>
                                </div>
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">{newArrivals.length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-700">Limit</p>
                                    <p className="text-2xl font-bold text-green-900">{settings.limit}</p>
                                </div>
                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">{settings.limit}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-700">Status</p>
                                    <p className="text-lg font-bold text-purple-900">{settings.isVisible ? "Visible" : "Hidden"}</p>
                                </div>
                                <Switch
                                    checked={settings.isVisible}
                                    onCheckedChange={toggleVisibility}
                                    className="scale-75"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <Button
                        onClick={() => setShowAddDialog(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 flex-1 sm:flex-none"
                        size="lg"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add New Product
                    </Button>
                    <Button
                        onClick={() => setShowSettingsDialog(true)}
                        variant="outline"
                        className="border-2 hover:bg-muted/50 transition-all duration-200 flex-1 sm:flex-none"
                        size="lg"
                    >
                        <Settings className="w-5 h-5 mr-2" />
                        Configure Settings
                    </Button>
                </div>

                {/* New Arrivals List */}
                <Card className="shadow-lg border-2 border-border/50">
                    <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                📦 Current Products
                                <span className="text-sm font-normal text-muted-foreground">
                                    ({newArrivals.length}/{settings.limit})
                                </span>
                            </CardTitle>
                            <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border">
                                Drag to reorder
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {newArrivals.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Plus className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">No products yet</h3>
                                <p className="text-muted-foreground mb-6">Start building your New Arrivals showcase</p>
                                <Button
                                    onClick={() => setShowAddDialog(true)}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Your First Product
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {newArrivals.map((arrival, index) => {
                                    const product =
                                        typeof arrival.productId === "object" ? arrival.productId : null;

                                    return (
                                        <div
                                            key={arrival._id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, arrival._id)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className={`group relative flex items-center gap-4 p-5 border-2 rounded-xl cursor-move transition-all duration-200 hover:shadow-md ${draggedItem === arrival._id
                                                    ? "bg-muted/80 opacity-50 scale-95 shadow-lg"
                                                    : "bg-gradient-to-r from-card to-card/80 hover:from-card/90 hover:to-card/70 border-border/50 hover:border-primary/20"
                                                }`}
                                        >
                                            <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />

                                            {/* ✅ New Arrival image + title */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <img
                                                    src={arrival.image || "/placeholder.png"}
                                                    alt={arrival.title || "New Arrival"}
                                                    className="w-16 h-16 object-cover rounded-md border"
                                                />

                                                <div className="min-w-0">
                                                    <h3 className="font-medium truncate">
                                                        {arrival.title || "Untitled Arrival"}
                                                    </h3>

                                                    {arrival.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {arrival.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ➜ arrow + linked product */}
                                            {product && (
                                                <div className="flex items-center gap-3">
                                                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={product.image || "/placeholder.png"}
                                                            alt={product.name || "Product"}
                                                            className="w-14 h-14 object-cover rounded-md border"
                                                        />
                                                        <div>
                                                            <Link
                                                                href={`/shop/${product.company?.name
                                                                    ?.toLowerCase()
                                                                    ?.replace(/\s+/g, "-")}/product/${product._id}`}
                                                                className="text-primary font-medium hover:underline"
                                                            >
                                                                {product.name || "Unknown Product"}
                                                            </Link>
                                                            {product.price && (
                                                                <p className="text-sm font-semibold text-primary">
                                                                    ₹{product.price.toFixed(2)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <Button
                                                    onClick={() => handleOpenEditDialog(arrival)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                                    title="Edit product"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        handleRemoveProduct(
                                                            arrival._id,
                                                            arrival.productId._id || arrival.productId
                                                        )
                                                    }
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                                    title="Remove product"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            {/* Position indicator */}
                                            <div className="absolute -left-2 -top-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                                                {index + 1}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>

                </Card>






                {/* Add Product Dialog */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add Product to New Arrivals</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Product Selection Section */}
                            <div>
                                <Label className="text-base font-semibold mb-2 block">1. Select Product</Label>
                                {/* Search Input */}
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search by product name or SKU..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                {/* Products List */}
                                <div className="border rounded-lg max-h-48 overflow-y-auto">
                                    {filteredProducts.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            {availableProducts.length === 0
                                                ? "No products available"
                                                : "No matching products found"}
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {filteredProducts.map((product) => {
                                                const isAlreadyAdded = newArrivals.some(
                                                    (item) =>
                                                        (item.productId._id || item.productId) === product._id
                                                )
                                                const isSelected = newArrivalForm.productId === product._id

                                                return (
                                                    <div
                                                        key={product._id}
                                                        className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer ${isSelected ? "bg-muted" : ""
                                                            }`}
                                                        onClick={() => {
                                                            if (!isAlreadyAdded) {
                                                                setNewArrivalForm({
                                                                    ...newArrivalForm,
                                                                    productId: product._id,
                                                                })
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                {product.image && (
                                                                    <img
                                                                        src={product.image}
                                                                        alt={product.name}
                                                                        className="w-10 h-10 object-cover rounded"
                                                                    />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-medium text-foreground truncate text-sm">
                                                                        {product.name}
                                                                    </h4>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {product.sku && `SKU: ${product.sku}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isAlreadyAdded && (
                                                                <span className="text-xs text-muted-foreground">Already added</span>
                                                            )}
                                                            {isSelected && (
                                                                <span className="text-xs font-semibold text-primary">Selected</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Form Fields Section */}
                            {newArrivalForm.productId && (
                                <>
                                    <div className="border-t pt-4">
                                        <Label className="text-base font-semibold mb-3 block">2. Add Title & Image</Label>

                                        <div className="space-y-3">
                                            <div>
                                                <Label htmlFor="title" className="text-sm">Title *</Label>
                                                <Input
                                                    id="title"
                                                    placeholder="e.g., Luxurious Face Cream"
                                                    value={newArrivalForm.title}
                                                    onChange={(e) =>
                                                        setNewArrivalForm({ ...newArrivalForm, title: e.target.value })
                                                    }
                                                    className="mt-1"
                                                />
                                            </div>

                                            <div>
                                                <ImageUploadField
                                                    label="Image *"
                                                    value={newArrivalForm.image}
                                                    onChange={(image) =>
                                                        setNewArrivalForm({ ...newArrivalForm, image })
                                                    }
                                                    folder="arrivals"
                                                    required={true}
                                                    placeholder="https://example.com/image.jpg"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="description" className="text-sm">Description</Label>
                                                <Textarea
                                                    id="description"
                                                    placeholder="Add a description for this product..."
                                                    value={newArrivalForm.description}
                                                    onChange={(e) =>
                                                        setNewArrivalForm({ ...newArrivalForm, description: e.target.value })
                                                    }
                                                    className="mt-1 resize-none"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end border-t pt-4">
                                        <Button
                                            onClick={() => {
                                                setNewArrivalForm({ title: "", image: "", description: "", productId: "" })
                                                setSearchQuery("")
                                            }}
                                            variant="outline"
                                        >
                                            Cancel
                                        </Button>
                                        <Button onClick={handleAddProduct} className="bg-primary">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Product
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Settings Dialog */}
                <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Arrivals Settings</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Maximum Products to Display
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={tempLimit}
                                    onChange={(e) => setTempLimit(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="bg-background border-border"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Only the first {tempLimit} products will be shown in the New Arrivals section
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="block text-sm font-medium text-foreground">
                                        Show New Arrivals Section
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Toggle the visibility of the entire section
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.isVisible}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, isVisible: checked })
                                    }
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleUpdateSettings}
                                    className="bg-primary text-primary-foreground flex-1"
                                >
                                    Save Settings
                                </Button>
                                <Button
                                    onClick={() => setShowSettingsDialog(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit Product Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader className="pb-4">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                ✏️ Edit New Arrival
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                Customize how this product appears in your New Arrivals section
                            </DialogDescription>
                        </DialogHeader>

                        {selectedArrival && (
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Product Selection */}
                                <div>
                                    <Label className="text-sm font-medium">Product *</Label>
                                    <select
                                        value={typeof selectedArrival.productId === "object"
                                            ? selectedArrival.productId._id
                                            : selectedArrival.productId}
                                        onChange={(e) =>
                                            setSelectedArrival({
                                                ...selectedArrival,
                                                productId: e.target.value
                                            })
                                        }
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                                        required
                                    >
                                        <option value="">Select Product</option>
                                        {availableProducts.map((product) => (
                                            <option key={product._id} value={product._id}>
                                                {product.name} {product.sku ? `(${product.sku})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="edit-title" className="text-sm">Title *</Label>
                                        <Input
                                            id="edit-title"
                                            placeholder="e.g., Luxurious Face Cream"
                                            value={selectedArrival.title}
                                            onChange={(e) =>
                                                setSelectedArrival({ ...selectedArrival, title: e.target.value })
                                            }
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <ImageUploadField
                                            label="Image *"
                                            value={selectedArrival.image}
                                            onChange={(image) =>
                                                setSelectedArrival({ ...selectedArrival, image })
                                            }
                                            folder="arrivals"
                                            required={true}
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="edit-description" className="text-sm">Description</Label>
                                        <Textarea
                                            id="edit-description"
                                            placeholder="Add a description for this product..."
                                            value={selectedArrival.description || ""}
                                            onChange={(e) =>
                                                setSelectedArrival({ ...selectedArrival, description: e.target.value })
                                            }
                                            className="mt-1 resize-none"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end border-t pt-4">
                                    <Button
                                        onClick={() => {
                                            setShowEditDialog(false)
                                            setSelectedArrival(null)
                                        }}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={handleEditArrival} className="bg-primary">
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    )
}