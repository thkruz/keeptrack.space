import React from 'react';
import { CollisionAnalysis, type CollisionEvent } from '~/components/features/CollisionAnalysis';
import { ConstellationAnalysis } from '~/components/features/ConstellationAnalysis.tsx';
import { CreateSatellite } from '~/components/features/CreateSatellite';
import { DebrisScanner } from '~/components/features/DebrisScanner';

export type ActiveFeature =
    | { name: 'collision'; props: { onClose: () => void; onCollisionSelect: (e: CollisionEvent) => void } }
    | { name: 'constellation'; props: { onClose: () => void; onConstellationSelect: (c: any) => void; onConstellationHighlight: (c: any, i?: 'hover' | 'select' | 'clear') => void } }
    | { name: 'create-satellite'; props: { onClose: () => void; onSatelliteCreated: (sat: any) => void } }
    | { name: 'debris-scanner'; props: { onClose: () => void; getInstancedApi: () => any; satelliteService: any } };

interface FeatureHostProps {
    active: ActiveFeature | null;
}

export const FeatureHost: React.FC<FeatureHostProps> = ({ active }) => {
    if (!active) return null;
    switch (active.name) {
        case 'collision':
            return (
                <CollisionAnalysis
                    isVisible={true}
                    onClose={active.props.onClose}
                    onCollisionSelect={active.props.onCollisionSelect}
                />
            );
        case 'constellation':
            return (
                <ConstellationAnalysis
                    isVisible={true}
                    onClose={active.props.onClose}
                    onConstellationSelect={active.props.onConstellationSelect}
                    onConstellationHighlight={active.props.onConstellationHighlight}
                />
            );
        case 'create-satellite':
            return (
                <CreateSatellite
                    isVisible={true}
                    onClose={active.props.onClose}
                    onSatelliteCreated={active.props.onSatelliteCreated}
                />
            );
        case 'debris-scanner':
            return (
                <DebrisScanner
                    isVisible={true}
                    onClose={active.props.onClose}
                    getInstancedApi={active.props.getInstancedApi}
                    satelliteService={active.props.satelliteService}
                />
            );
        default:
            return null;
    }
}
