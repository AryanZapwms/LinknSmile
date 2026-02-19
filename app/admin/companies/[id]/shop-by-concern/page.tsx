"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, GripVertical, HeartPulse, Plus, Search, Settings, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ImageUploadField } from "@/components/admin/image-upload-field"

interface Product {
    _id: string
    name: string
    price?: number
    image?: string
    sku?: string
    slug?: string
}

interface ConcernItem {
    _id: string
    title: string
    image: string
    description?: string
    isActive: boolean
    priority: number
    product: Product | string
}

interface ShopByConcernSettings {
    isVisible: boolean
    limit: number
}

export default function ShopByConcernPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    // params can be string | string[] | undefined in Next.js app router
    const companyId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined)

    const [items, setItems] = useState<ConcernItem[]>([])
    const [settings, setSettings] = useState<ShopByConcernSettings>({ isVisible: true, limit: 6 })
    const [loading, setLoading] = useState(true)
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null)

    // dialogs
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)

    const [selectedItem, setSelectedItem] = useState<ConcernItem | null>(null)

    // product search
    const [searchQuery, setSearchQuery] = useState("")
    const [availableProducts, setAvailableProducts] = useState<Product[]>([])
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

    // new concern
    const [newConcern, setNewConcern] = useState({
        title: "",
        image: "",
        description: "",
        productId: "",
        isActive: true,
    })

    // temporary settings used in dialog
    const [tempSettings, setTempSettings] = useState<ShopByConcernSettings>({ isVisible: true, limit: 6 })

    useEffect(() => {
        if (!session) {
            router.push("/auth/login")
            return
        }

        if (!companyId) return

        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, companyId])

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

            const res = await fetch(`/api/companies/${companyId}/shop-by-concern?all=true`)
            if (!res.ok) throw new Error("Failed to fetch shop by concern")
            const data = await res.json()

            const mappedItems = Array.isArray(data.items)
                ? data.items.map((item: any) => ({
                    _id: item._id,
                    title: item.title,
                    image: item.image,
                    description: item.description,
                    isActive: item.isActive ?? true,
                    priority: item.priority ?? 0,
                    product: item.product,
                }))
                : []

            setItems(mappedItems)
            setSettings(data.settings || { isVisible: true, limit: 6 })
            setTempSettings(data.settings || { isVisible: true, limit: 6 })

            const productsRes = await fetch(`/api/products?company=${companyId}`)
            if (!productsRes.ok) throw new Error("Failed to fetch products")
            const productsData = await productsRes.json()
            const products = Array.isArray(productsData) ? productsData : productsData.products || []
            setAvailableProducts(products)
            setFilteredProducts(products)
        } catch (error) {
            console.error("Error fetching data:", error)
            alert("Failed to load shop by concern data")
        } finally {
            setLoading(false)
        }
    }

    const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items])

    const handleAddConcern = async () => {
        if (!newConcern.title || !newConcern.image || !newConcern.productId) {
            alert("Please fill in title, image, and select a product")
            return
        }

        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newConcern.title,
                    image: newConcern.image,
                    description: newConcern.description,
                    productId: newConcern.productId,
                    isActive: newConcern.isActive,
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to add concern")
            }

            await fetchData()
            setShowAddDialog(false)
            setNewConcern({ title: "", image: "", description: "", productId: "", isActive: true })
            alert("Concern added successfully")
        } catch (error) {
            console.error("Error adding concern:", error)
            alert(error instanceof Error ? error.message : "Failed to add concern")
        }
    }

    const handleEditConcern = async () => {
        if (!selectedItem) return

        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/${selectedItem._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: selectedItem.title,
                    image: selectedItem.image,
                    description: selectedItem.description,
                    productId: typeof selectedItem.product === "object" ? (selectedItem.product as Product)._id : selectedItem.product,
                    isActive: selectedItem.isActive,
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to update concern")
            }

            await fetchData()
            setShowEditDialog(false)
            setSelectedItem(null)
            alert("Concern updated successfully")
        } catch (error) {
            console.error("Error updating concern:", error)
            alert(error instanceof Error ? error.message : "Failed to update concern")
        }
    }

    const handleDeleteConcern = async (itemId: string) => {
        if (!confirm("Are you sure you want to delete this concern?")) return

        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/${itemId}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to delete concern")
            }

            await fetchData()
            alert("Concern deleted successfully")
        } catch (error) {
            console.error("Error deleting concern:", error)
            alert(error instanceof Error ? error.message : "Failed to delete concern")
        }
    }

    const handleUpdateSettings = async () => {
        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: tempSettings.isVisible, limit: tempSettings.limit }),
            })

            if (!res.ok) throw new Error("Failed to update settings")

            setSettings(tempSettings)
            setShowSettingsDialog(false)
            alert("Settings updated successfully")
        } catch (error) {
            console.error("Error updating settings:", error)
            alert("Failed to update settings")
        }
    }

    const handleToggleVisibility = async () => {
        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: !settings.isVisible, limit: settings.limit }),
            })

            if (!res.ok) throw new Error("Failed to update visibility")

            setSettings({ ...settings, isVisible: !settings.isVisible })
            alert(`Shop by Concern section ${!settings.isVisible ? "shown" : "hidden"}!`)
        } catch (error) {
            console.error("Error toggling visibility:", error)
            alert("Failed to update visibility")
        }
    }

    const handleDragStart = (itemId: string) => {
        setDraggedItemId(itemId)
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
    }

    const handleDrop = async (targetIndex: number) => {
        if (!draggedItemId) return

        const draggedIndex = items.findIndex((item) => item._id === draggedItemId)
        if (draggedIndex === -1 || draggedIndex === targetIndex) return

        const reordered = [...items]
        const [draggedItem] = reordered.splice(draggedIndex, 1)
        reordered.splice(targetIndex, 0, draggedItem)

        setItems(reordered)
        setDraggedItemId(null)

        try {
            const itemIds = reordered.map((item) => item._id)
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemIds }),
            })

            if (!res.ok) throw new Error("Failed to reorder concerns")
        } catch (error) {
            console.error("Error reordering concerns:", error)
            alert("Failed to reorder concerns")
            fetchData()
        }
    }

    const handleOpenEditDialog = (item: ConcernItem) => {
        setSelectedItem(item)
        setShowEditDialog(true)
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Loading Shop by Concern...</p>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/companies">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Companies
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                                <HeartPulse className="w-6 h-6 text-primary" />
                                Shop by Concern
                            </h1>
                            <p className="text-muted-foreground">Curate concern-based highlights for this company</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Concern
                        </Button>
                        <Button variant="outline" onClick={() => { setTempSettings(settings); setShowSettingsDialog(true); }}>
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Section Visibility</CardTitle>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">{settings.isVisible ? "Visible" : "Hidden"}</span>
                                <Switch checked={settings.isVisible} onCheckedChange={handleToggleVisibility} />
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Active Concerns ({activeCount}/{settings.limit})</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" className="pl-9" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {items.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <p>No concerns configured yet.</p>
                                <p className="text-sm">Use "Add Concern" to create your first entry.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item, index) => {
                                    const product = item.product && typeof item.product === "object" ? (item.product as Product) : undefined

                                    return (
                                        <div
                                            key={item._id}
                                            draggable
                                            onDragStart={() => handleDragStart(item._id)}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop(index)}
                                            className={`flex flex-col gap-4 rounded-lg border p-4 transition-colors ${draggedItemId === item._id ? "bg-muted/60" : "bg-card hover:bg-muted/40"}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <GripVertical className="mt-2 h-5 w-5 text-muted-foreground" />
                                                <div className="flex w-full flex-col gap-3">
                                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-medium leading-none">{product ? product.name : item.title}</p>
                                                            <p className="text-xs text-muted-foreground">{product ? product.sku : "Unknown SKU"}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge>{index + 1}</Badge>
                                                            <Switch
                                                                checked={item.isActive}
                                                                onCheckedChange={async (checked) => {
                                                                    const updatedItems = items.map((it) => (it._id === item._id ? { ...it, isActive: checked } : it))
                                                                    setItems(updatedItems)
                                                                    try {
                                                                        const res = await fetch(`/api/companies/${companyId}/shop-by-concern/${item._id}`, {
                                                                            method: "PUT",
                                                                            headers: { "Content-Type": "application/json" },
                                                                            body: JSON.stringify({ isActive: checked }),
                                                                        })
                                                                        if (!res.ok) throw new Error("Failed to update concern visibility")
                                                                    } catch (error) {
                                                                        console.error("Error updating concern visibility:", error)
                                                                        alert("Failed to update concern visibility")
                                                                        fetchData()
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <img src={item.image || "/companylogo.jpg"} alt={item.title} className="h-20 w-32 rounded-md object-cover border" />
                                                        <p className="text-sm text-muted-foreground line-clamp-3">{item.description || "No description provided."}</p>
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(item)}>Edit</Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteConcern(item._id)}>
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Add Concern Dialog */}
                <Dialog open={showAddDialog} onOpenChange={(open) => setShowAddDialog(open)}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add Concern</DialogTitle>
                            <DialogDescription>Create a new concern and associate it with a product.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-2">
                            <div>
                                <Label htmlFor="concern-title">Title</Label>
                                <Input id="concern-title" value={newConcern.title} onChange={(e) => setNewConcern((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Dry Skin" />
                            </div>

                            <div>
                                <ImageUploadField
                                    label="Image"
                                    value={newConcern.image}
                                    onChange={(image) => setNewConcern((s) => ({ ...s, image }))}
                                    folder="shop-by-concern"
                                    required={true}
                                    placeholder="https://..."
                                />
                            </div>

                            <div>
                                <Label htmlFor="concern-desc">Description</Label>
                                <Textarea id="concern-desc" value={newConcern.description} onChange={(e) => setNewConcern((s) => ({ ...s, description: e.target.value }))} placeholder="Short description (optional)" rows={3} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Associate product</Label>
                                    <span className="text-xs text-muted-foreground">Select one</span>
                                </div>

                                <div className="mb-2">
                                    <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-3" />
                                </div>

                                <div className="max-h-48 overflow-auto border rounded-md p-2">
                                    {filteredProducts.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No products found.</p>
                                    ) : (
                                        filteredProducts.map((p) => {
                                            const selected = newConcern.productId === p._id
                                            return (
                                                <div key={p._id} onClick={() => setNewConcern((s) => ({ ...s, productId: p._id }))} className={`flex items-center justify-between gap-3 p-2 rounded cursor-pointer mb-1 ${selected ? "ring-2 ring-primary bg-muted/30" : "hover:bg-muted/20"}`}>
                                                    <div className="flex items-center gap-3">
                                                        <img src={(p as Product).image || "/companylogo.jpg"} alt={p.name} className="h-10 w-10 object-cover rounded" />
                                                        <div>
                                                            <p className="text-sm font-medium">{p.name}</p>
                                                            <p className="text-xs text-muted-foreground">{p.sku}</p>
                                                        </div>
                                                    </div>
                                                    {selected && <Badge>Selected</Badge>}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Label>Active</Label>
                                <Switch checked={newConcern.isActive} onCheckedChange={(checked) => setNewConcern((s) => ({ ...s, isActive: checked }))} />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleAddConcern} disabled={!newConcern.title || !newConcern.image || !newConcern.productId}>Add Concern</Button>
                            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Settings Dialog */}
                <Dialog open={showSettingsDialog} onOpenChange={(open) => setShowSettingsDialog(open)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Shop by Concern Settings</DialogTitle>
                            <DialogDescription>Control visibility and the active concerns limit.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-2">
                            <div className="flex items-center justify-between">
                                <Label>Section Visible</Label>
                                <Switch checked={tempSettings.isVisible} onCheckedChange={(checked) => setTempSettings((s) => ({ ...s, isVisible: checked }))} />
                            </div>

                            <div>
                                <Label htmlFor="limit">Active Items Limit</Label>
                                <Input id="limit" type="number" value={String(tempSettings.limit)} onChange={(e) => {
                                    const v = parseInt(e.target.value || "0", 10)
                                    setTempSettings((s) => ({ ...s, limit: isNaN(v) ? 0 : v }))
                                }} />
                                <p className="text-xs text-muted-foreground mt-1">How many active concerns can be shown at once.</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleUpdateSettings}>Save Settings</Button>
                            <Button variant="ghost" onClick={() => setShowSettingsDialog(false)}>Cancel</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Concern Dialog */}
                <Dialog open={showEditDialog} onOpenChange={(open) => setShowEditDialog(open)}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Concern</DialogTitle>
                            <DialogDescription>Edit existing concern details.</DialogDescription>
                        </DialogHeader>

                        {selectedItem ? (
                            <div className="grid gap-4 py-2">
                                <div>
                                    <Label htmlFor="edit-title">Title</Label>
                                    <Input id="edit-title" value={selectedItem.title} onChange={(e) => setSelectedItem((s) => s ? { ...s, title: e.target.value } : s)} />
                                </div>

                                <div>
                                    <ImageUploadField
                                        label="Image"
                                        value={selectedItem.image}
                                        onChange={(image) => setSelectedItem((s) => s ? { ...s, image } : s)}
                                        folder="shop-by-concern"
                                        required={true}
                                        placeholder="https://..."
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit-desc">Description</Label>
                                    <Textarea id="edit-desc" value={selectedItem.description || ""} onChange={(e) => setSelectedItem((s) => s ? { ...s, description: e.target.value } : s)} rows={3} />
                                </div>

                                <div>
                                    <Label>Associate product</Label>
                                    <div className="max-h-48 overflow-auto border rounded-md p-2">
                                        {availableProducts.map((p) => {
                                            const currentProductId = typeof selectedItem.product === "object" ? (selectedItem.product as Product)._id : String(selectedItem.product)
                                            const selected = currentProductId === p._id
                                            return (
                                                <div key={p._id} onClick={() => setSelectedItem((s) => s ? { ...s, product: p } : s)} className={`flex items-center gap-3 p-2 rounded cursor-pointer mb-1 ${selected ? "ring-2 ring-primary bg-muted/30" : "hover:bg-muted/20"}`}>
                                                    <img src={p.image || "/companylogo.jpg"} alt={p.name} className="h-10 w-10 object-cover rounded" />
                                                    <div>
                                                        <p className="text-sm font-medium">{p.name}</p>
                                                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                                                    </div>
                                                    {selected && <Badge>Selected</Badge>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Label>Active</Label>
                                    <Switch checked={selectedItem.isActive} onCheckedChange={(checked) => setSelectedItem((s) => s ? { ...s, isActive: checked } : s)} />
                                </div>

                                <DialogFooter>
                                    <Button onClick={handleEditConcern}>Save changes</Button>
                                    <Button variant="ghost" onClick={() => { setShowEditDialog(false); setSelectedItem(null); }}>Cancel</Button>
                                </DialogFooter>

                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No item selected.</p>
                        )}
                    </DialogContent>
                </Dialog>

            </div>
        </main>
    )
}
