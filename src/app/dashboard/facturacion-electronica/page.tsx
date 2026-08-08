"use client";

import { useState } from "react";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";
import {
    Receipt,
    Lock,
    FileText,
    Settings,
    Search,
    Undo2,
    PhoneCall
} from "lucide-react";

export default function FacturacionElectronicaPage() {
    const { coloresActuales } = useTheme();
    const { configuracion } = useConfiguracionEmpresa();

    // TODO: Haremos esto real en la Fase 2 (cuando modifiquemos prisma)
    // Por ahora lo forzamos a true para poder ver y armar la interfaz,
    // luego pasará a leer configNegocio.modulos.facturacionElectronica (ejemplo).
    const tieneModuloActivo = true;

    // Interfaz de bloqueo si no tiene el módulo activo
    if (!tieneModuloActivo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
                <div className={`p-6 rounded-2xl bg-card border ${coloresActuales.border} shadow-lg max-w-md w-full text-center space-y-6 relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${coloresActuales.primary}`} />

                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <Lock className={`w-8 h-8 text-muted-foreground`} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Módulo Inactivo</h2>
                        <p className="text-muted-foreground">
                            La Facturación Electrónica no está habilitada para esta cuenta. Para emitir facturas legales ante la DIAN, necesitas activar este módulo premium.
                        </p>
                    </div>

                    <Button className={`w-full bg-gradient-to-r ${coloresActuales.primary} hover:opacity-90`}>
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Contactar a Soporte
                    </Button>
                </div>
            </div>
        );
    }

    // Interfaz principal (si tiene el módulo activo)
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Receipt className={`w-6 h-6 text-blue-500`} />
                        Facturación Electrónica DIAN
                    </h1>
                    <p className="text-muted-foreground">
                        Gestiona, emite y consulta tus comprobantes fiscales.
                    </p>
                </div>

                <Button className={`bg-gradient-to-r ${coloresActuales.primary}`}>
                    Generar Factura Manual
                </Button>
            </div>

            <Tabs defaultValue="historial" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="historial" className="gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">Historial</span>
                    </TabsTrigger>
                    <TabsTrigger value="notas" className="gap-2">
                        <Undo2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Notas Crédito</span>
                    </TabsTrigger>
                    <TabsTrigger value="configuracion" className="gap-2">
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Configuración</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="historial" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Historial de Documentos</CardTitle>
                            <CardDescription>
                                Todas las facturas electrónicas emitidas recientemente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Buscar por cliente, CUFE, o prefijo..."
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            <div className="rounded-md border flex items-center justify-center py-12 text-muted-foreground">
                                <div className="text-center">
                                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p>Aún no hay facturas emitidas.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notas" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notas de Crédito</CardTitle>
                            <CardDescription>
                                Historial de devoluciones o anulaciones enviadas a la DIAN.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border flex items-center justify-center py-12 text-muted-foreground">
                                <div className="text-center">
                                    <Undo2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p>No se encontraron notas crédito.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="configuracion" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración de Proveedor Tecnológico</CardTitle>
                            <CardDescription>
                                Parámetros de conexión con la entidad validadora (Ej. Alegra o Siigo).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Proveedor Tecnológico</span>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                                        <option value="alegra">Alegra API (Predeterminado)</option>
                                        <option value="siigo">Siigo Nube</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Entorno</span>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                                        <option value="sandbox">Pruebas (Sandbox DIAN - Sin Validez Fiscal)</option>
                                        <option value="production">Producción (Documentos Oficiales)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Token de Acceso (API Key)</span>
                                    <Input type="password" placeholder="••••••••••••••••••••" />
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Pin / Contraseña de Certificado</span>
                                    <Input type="password" placeholder="••••••••" />
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Prefijo de Facturación</span>
                                    <Input placeholder="Ej. SETT" />
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-medium">Resolución de Facturación</span>
                                    <Input placeholder="Número de resolución otorgado por la DIAN" />
                                </div>
                            </div>

                            <div className="pt-4 border-t flex justify-end">
                                <Button>Guardar Configuración</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
