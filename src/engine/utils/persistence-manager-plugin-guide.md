# PersistenceManager Plugin Integration Guide

This guide shows how to integrate your plugin with the PersistenceManager for storing preferences and user data.

## Basic Usage

### 1. Register Your Keys

In your plugin's `init()` method, register the keys you'll use:

```typescript
import { PersistenceManager } from '@app/engine/utils/persistence-manager';

export class MyPlugin extends KeepTrackPlugin {
  readonly id = 'MyPlugin';

  init() {
    const pm = PersistenceManager.getInstance();

    // Register preference keys
    pm.registerKey('myPluginEnabled', 'preference', this.id);
    pm.registerKey('myPluginColor', 'preference', this.id);

    // Register user data keys
    pm.registerKey('myPluginSavedItems', 'userData', this.id);
  }
}
```

### 2. Extend the TypeScript Interfaces (Optional but Recommended)

For type safety, extend the `Preferences` and `UserData` interfaces using TypeScript module augmentation:

```typescript
// In your plugin file or a separate .d.ts file
declare module '@app/engine/utils/persistence-manager' {
  interface Preferences {
    myPluginEnabled?: boolean;
    myPluginColor?: string;
  }

  interface UserData {
    myPluginSavedItems?: { id: number; name: string }[];
  }
}
```

### 3. Read and Write Data

```typescript
export class MyPlugin extends KeepTrackPlugin {
  readonly id = 'MyPlugin';

  init() {
    const pm = PersistenceManager.getInstance();

    // Register keys
    pm.registerKey('myPluginEnabled', 'preference', this.id);
    pm.registerKey('myPluginSavedItems', 'userData', this.id);

    // Read preferences
    const isEnabled = pm.preferences.myPluginEnabled ?? true; // with default

    // Read user data
    const savedItems = pm.userData.myPluginSavedItems ?? [];

    // Load saved items
    this.loadItems(savedItems);
  }

  private saveSettings() {
    const pm = PersistenceManager.getInstance();

    // Write preferences
    pm.preferences.myPluginEnabled = this.isEnabled;
    pm.preferences.myPluginColor = this.selectedColor;

    // Trigger sync (automatic after 3 seconds)
    // Or force immediate sync:
    pm.forceSync();
  }

  private addItem(item: { id: number; name: string }) {
    const pm = PersistenceManager.getInstance();

    // Get current items
    const items = pm.userData.myPluginSavedItems ?? [];

    // Add new item
    items.push(item);

    // Save back (triggers automatic sync)
    pm.userData.myPluginSavedItems = items;
  }
}
```

## Configuration Flags

The PersistenceManager uses two flags to control where data is saved:

- `isUseLocalStorage`: When true, data is saved to browser localStorage
- `isUseRemoteStorage`: When true, the `debouncedSync` event is emitted for remote sync

### Example: Configure Storage

```typescript
const pm = PersistenceManager.getInstance();

// Enable localStorage
pm.isUseLocalStorage = true;

// Enable remote storage (Supabase)
pm.isUseRemoteStorage = true;

// When either flag is true, changes trigger the debounced sync
// The user-account plugin listens for the debouncedSync event
```

## Events

The PersistenceManager emits events that you can listen to:

```typescript
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';

// Listen for sync events
EventBus.getInstance().on(EventBusEvent.debouncedSync, () => {
  console.log('Data was synced!');
  // Upload to Supabase or other remote storage
});

// Trigger data rebuild manually
EventBus.getInstance().emit(EventBusEvent.buildDataUpdate);
EventBus.getInstance().emit(EventBusEvent.buildPreferencesUpdate);
```

## Automatic Sync Triggers

The following events automatically trigger a sync:

- `EventBusEvent.onWatchlistAdd`
- `EventBusEvent.onWatchlistRemove`
- `EventBusEvent.setSensor`
- `EventBusEvent.saveSettings`

## Best Practices

1. **Always register your keys** in the `init()` method to catch duplicate key errors early
2. **Use module augmentation** for TypeScript type safety
3. **Use optional chaining** (`??`) when reading values to provide defaults
4. **Don't stringify data yourself** - PersistenceManager handles serialization
5. **Let auto-sync work** - only use `forceSync()` when absolutely necessary
6. **Namespace your keys** - use descriptive names like `myPluginFeatureName` instead of just `enabled`

## Debugging

To see all registered keys in development:

```typescript
const pm = PersistenceManager.getInstance();
console.log(pm.getRegisteredKeys());
```

To check if a key is registered:

```typescript
const pm = PersistenceManager.getInstance();
if (pm.isKeyRegistered('myPluginEnabled')) {
  console.log('Key is registered!');
}
```

## Migration from Old API

If you're migrating from the old `StorageKey` enum system:

**Old:**
```typescript
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';

const pm = PersistenceManager.getInstance();
const value = pm.getItem(StorageKey.MY_PLUGIN_SETTING);
pm.saveItem(StorageKey.MY_PLUGIN_SETTING, 'newValue');
```

**New:**
```typescript
import { PersistenceManager } from '@app/engine/utils/persistence-manager';

const pm = PersistenceManager.getInstance();

// Register first
pm.registerKey('myPluginSetting', 'preference', 'MyPlugin');

// Then use
const value = pm.preferences.myPluginSetting;
pm.preferences.myPluginSetting = 'newValue';
```
