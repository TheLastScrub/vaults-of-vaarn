/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class VaarnActorSheet extends ActorSheet
{

  #_hitTargets = new Set();

  /** @override */
  static get defaultOptions()
  {
    return mergeObject(super.defaultOptions,
    {
      classes: ["vaarn", "sheet", "actor"],
      template: "systems/vaults-of-vaarn/templates/actor/actor-sheet.html",
      width: 1000,
      height: 650,
      tabs: [{ navSelector: ".description-tabs", contentSelector: ".description-tabs-content", initial: "description" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  
  getData()
  {
    let data = super.getData();

    this._prepareCharacterItems(data);

    return data;
  }

  /** @override */
  activateListeners(html)
  {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    //ability button clicked
    html.find('.vaarn-ability-button').click(ev => { this._onAbility_Clicked($(ev.currentTarget)[0].id); });
    html.find('.vaarn-morale-button').click(this._onMoraleCheck.bind(this));
    html.find('.vaarn-armor-button').click(this._onArmorCheck.bind(this));
    html.find('.update-all-bonuses-to-level').click(this._updateBonusesToLevel.bind(this));
    html.find('.update-health-to-level-x4').click(this._updateHealthToLevelx4.bind(this));
    html.find('.update-health-to-level-x5').click(this._updateHealthToLevelx5.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // view Inventory Item
    html.find('.item-view').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));        
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      //const button = ev.currentTarget;
      //const li = button.closest(".item");
      //const item = this.actor.items.get(li?.dataset.itemId);
      //return item.delete();
      const el = $(ev.currentTarget).parents(".item");
      let options = {};
      this.actor.deleteEmbeddedDocuments("Item", [el.data('item-id')], options);
    });

    //inventory weapon rolls
    html.find('.item-roll').click(ev =>
    {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._onItemRoll(item, ev.currentTarget);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event)
  {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    const cls = getDocumentClass("Item");
    return cls.create(itemData, {parent: this.actor});    
  }

  async _prepareCharacterItems(sheetData){

    const actorData = sheetData.actor;
    const traits = [];
    const heldItems = [];

    for (let i of sheetData.items) {
      if (i.type === 'trait') {                
        traits.push(i);
      }
      else{
        heldItems.push(i);
      }
    }

    actorData.traits = traits;
    actorData.heldItems = heldItems;
  }

  _onAbility_Clicked(ability)
  {
    let score = 0;
    let damage = 0;
    let name = "";
    switch(ability)
    {
      case "str": score = this.object.system.abilities.str.value; damage = this.object.system.abilities.str.damage; name="STR"; break;
      case "dex": score = this.object.system.abilities.dex.value; damage = this.object.system.abilities.dex.damage; name="DEX"; break;
      case "con": score = this.object.system.abilities.con.value; damage = this.object.system.abilities.con.damage; name="CON"; break;
      case "int": score = this.object.system.abilities.int.value; damage = this.object.system.abilities.int.damage; name="INT"; break;
      case "wis": score = this.object.system.abilities.wis.value; damage = this.object.system.abilities.wis.damage; name="WIS"; break;
      case "cha": score = this.object.system.abilities.cha.value; damage = this.object.system.abilities.cha.damage; name="CHA"; break;
      case "psy": score = this.object.system.abilities.psy.value; damage = this.object.system.abilities.psy.damage; name="PSY"; break;
      case "ego": score = this.object.system.abilities.ego.value; damage = this.object.system.abilities.ego.damage; name="EGO"; break;
    }

    damage = Math.abs(damage);

    let formula = `1d20+${score}`;

    if(damage !== 0){
      formula += `-${damage}`;
    }

    let r = new Roll(formula);
    r.evaluate({async: false});

    let returnCode = 0;
    let messageHeader = "<b>" + name + "</b>";
    if(r.dice[0].total === 1)
      messageHeader += ' - <span class="vaarn-ability-crit vaarn-ability-critFailure">CRITICAL FAILURE!</span>';
    else if(r.dice[0].total === 20)
      messageHeader += ' - <span class="vaarn-ability-crit vaarn-ability-critSuccess">CRITICAL SUCCESS!</span>';

    r.toMessage({speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: messageHeader});
    return r;
  }

  async _updateHealthToLevelx4(event){
    await this._updateHealthToLevelTimesModifier(4);
  }

  async _updateHealthToLevelx5(event){
    await this._updateHealthToLevelTimesModifier(5);
  }

  async _updateHealthToLevelTimesModifier(modifier){
    let updatedData = duplicate(this.actor.system);

    updatedData.health.max = updatedData.level.value * modifier;
    updatedData.health.value = updatedData.level.value * modifier;

    await this.actor.update({'data': updatedData});
  }

  async _updateBonusesToLevel(event){

    let updatedData = duplicate(this.actor.system);
    
    updatedData.abilities.str.max = updatedData.level.value;
    updatedData.abilities.str.value = updatedData.level.value;

    updatedData.abilities.dex.max = updatedData.level.value;
    updatedData.abilities.dex.value = updatedData.level.value;

    updatedData.abilities.con.max = updatedData.level.value;
    updatedData.abilities.con.value = updatedData.level.value;

    updatedData.abilities.int.max = updatedData.level.value;
    updatedData.abilities.int.value = updatedData.level.value;

    updatedData.abilities.psy.max = updatedData.level.value;
    updatedData.abilities.psy.value = updatedData.level.value;

    updatedData.abilities.ego.max = updatedData.level.value;
    updatedData.abilities.ego.value = updatedData.level.value;

    await this.actor.update({'data': updatedData});
  }

  async _onMoraleCheck(event)
  {
    event.preventDefault();

    let r = new Roll(`1d20+${this.object.system.morale.value}`);
    await r.evaluate({async: true});
    
    let messageHeader = "";
    if(r.total < 15){
      messageHeader += '<span class="vaarn-ability-crit vaarn-ability-critFailure">Is fleeing/surrendering</span>';
    }      
    else{
      messageHeader += '<span class="vaarn-ability-crit vaarn-ability-critSuccess">Is staying</span>';
    }
    
    const chatData = {
      speaker: ChatMessage.getSpeaker({actor: this.actor, token: this.token, alias: this.actor.name}),
      flavor: messageHeader
    };

    r.toMessage(chatData);
  }

  _onArmorCheck(event)
  {
    let name = "ARMOR";
    let score = this.object.system.armor.bonus
    event.preventDefault();

    let formula = `1d20+${score}`;
    let r = new Roll(formula);
    r.evaluate({async: false});

    let returnCode = 0;
    let messageHeader = "<b>" + name + "</b>";
    if(r.dice[0].total === 1)
      messageHeader += ' - <span class="vaarn-ability-crit vaarn-ability-critFailure">CRITICAL FAILURE!</span>';
    else if(r.dice[0].total === 20)
      messageHeader += ' - <span class="vaarn-ability-crit vaarn-ability-critSuccess">CRITICAL SUCCESS!</span>';

    r.toMessage({speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: messageHeader});
    return r;
  }

  _onItemRoll(item, eventTarget)
  {
    if(eventTarget.title === "attack")
    {
      if(item.type === "weaponMelee" && !this._itemIsBroken(item))
      {
        const roll = this._onAbility_Clicked("str");
        if(roll.dice[0].total === 1)
          this._weaponCriticalFailure(item);

        this._checkToHitTargets(roll, item);
      }
      else if(item.type === "weaponRanged" && !this._itemIsBroken(item))
          this._rangedAttackRoll(item);
    }
    else if(eventTarget.title === "damage" && !this._itemIsBroken(item))
    {
      let r = new Roll(item.system.damageDice);
      r.evaluate({async: false});
      let messageHeader = "<b>" + item.name + "</b> damage";
      r.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: messageHeader});

      this.#_hitTargets.forEach((target)=>
      {
        this._doDamage(target, r.total);
      });
    }
  }

  _weaponCriticalFailure(item)
  {
      item.system.quality.value -= 1;
      item.update({"data.quality.value":item.system.quality.value});
      if(item.system.quality.value <= item.system.quality.min)
      {
        let content = '<span class="vaarn-ability-crit vaarn-ability-critFailure"><b>' + item.name + "</b> broke!</span>";
        ChatMessage.create({
          user: game.user._id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: content
        });
      }
      else
      {
        let content = '<span><b>' + item.name + "</b> quality reduced to " + item.system.quality.value + "/" + item.system.quality.max; + "</span>";
        ChatMessage.create({
          user: game.user._id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: content
        });
      }
  }

  _itemIsBroken(item)
  {
    if(item.system.quality.value <= 0)
    {
      let content = '<span class="vaarn-ability-crit vaarn-ability-critFailure"><b>' + item.name + "</b> is broken!</span>";
        ChatMessage.create({
          user: game.user._id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: content
        });
      return true;
    }

    return false;
  }

  _rangedAttackRoll(item)
  {
    if(item.system.ammo.value > 0)
    {
      const roll = this._onAbility_Clicked("wis");
      if(roll.dice[0].total === 1)
        this._weaponCriticalFailure(item);

      item.system.ammo.value -= 1;
      item.update({"system.ammo.value": item.system.ammo.value});
      if(item.system.ammo.value <= 0)
        this._createNoAmmoMsg(item, true);

      this._checkToHitTargets(roll, item);
    }
    else
      this._createNoAmmoMsg(item, false);
  }

  _createNoAmmoMsg(item, outOfAmmo)
  {
      let content = "<b>" + item.name + "</b> ";
      if(outOfAmmo === true)
      { content += "is out of ammo!"; }
      else
      { content += "has no ammo!"; }

        ChatMessage.create({
          user: game.user._id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: content
        });
  }

  _checkToHitTargets(roll, item)
  {
    this.#_hitTargets.clear();
    game.users.current.targets.forEach((x)=>
    {
      if(roll.total > x.actor.system.armor.value)
      {
        this._createHitMsg(x.actor, false, item);
        this.#_hitTargets.add(x);
      }
      else
        this._createHitMsg(x.actor, true, item);
    });
  }

  _createHitMsg(targetActor, missed, item)
  {
    const hitMsg = "<b>hit</b> " + targetActor.name + " with " + item.name;
    const missMsg = "<b>missed</b> " + targetActor.name + " with " + item.name;

    ChatMessage.create(
    {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: (missed ? missMsg : hitMsg),
    });
  }

  _doDamage(token, dmg)
  {
    const currentHP = token.actor.system.health.value;
    let newHP = currentHP - dmg;
    if(currentHP > 0 && newHP <= 0)
    {
      newHP = 0;
      const msg = "is unconscious";
      ChatMessage.create(
      {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: token.actor }),
        content: msg,
      });
    }
    else if(currentHP === 0)
    {
      const msg = "is killed";
      ChatMessage.create(
      {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: token.actor }),
        content: msg,
      });
    }

    token.actor.update({'system.health.value': newHP});
  }
}
