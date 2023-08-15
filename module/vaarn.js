// Import Modules
import { VaarnActor } from "./actor/actor.js";
import { VaarnActorSheet } from "./actor/actor-sheet.js";
import { VaarnItem } from "./item/item.js";
import { VaarnItemSheet } from "./item/item-sheet.js";

Hooks.once('init', async function() {

  game.vaarn = {
    VaarnActor,
    VaarnItem
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  // Define custom Entity classes
  CONFIG.Actor.documentClass = VaarnActor;
  CONFIG.Item.documentClass = VaarnItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("vaarn", VaarnActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("vaarn", VaarnItemSheet, { makeDefault: true });

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('isWeapon', function(item)
  {
      return (item.type === 'weaponMelee' || item.type === 'weaponRanged');
  });

  Handlebars.registerHelper('inventorySlots', function(inventorySlots)
  {
      if(inventorySlots.used >= inventorySlots.value)
        return new Handlebars.SafeString('<span class="vaarn-encumbered">' + inventorySlots.used + "/" + inventorySlots.value + "</span>");
      else
        return new Handlebars.SafeString(inventorySlots.used + "/" + inventorySlots.value);
  });

  Handlebars.registerHelper('isItemBroken', function(item)
  {
    if(item.type === "spell")
      return (item.system.used === "true" || !item.system.spellUsable);
    else
    {
      if(item.system.quality)
        return item.system.quality.value <= 0;
      else
        return false;
    }
  });

  Handlebars.registerHelper('hasQuality', function(item)
  {
    return item.system.quality !== undefined;
  });

  Handlebars.registerHelper('if_eq', function(a, b, opts) {
    if (a == b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
  });
  
});