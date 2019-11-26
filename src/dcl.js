room.registerElement('dcl', {
  create() {
    // FIXME - hack to enable leap motion for this demo
    janus.engine.systems.controls.settings.leapmotion.enabled = true;
    this.parceldata = {};
    this.parcels = {};
    this.rootparcels = {};
    this.currentparcel = [Infinity, Infinity];
/*
    this.currentparcelobj = this.createObject('object', {
      id: 'cube',
      col: 'green',
      pos: [0, .1, 0],
      scale: [10, .2, 10]
    });
    this.currentparcellabel = this.createObject('text', {
      text: '0,0',
      pos: [0, .5, 0],
      scale: [5, 5, 5],
      col: 'black',
      rotation: [-90, 0, 0],
      collision_trigger: true
    });
    this.currentparcelobj.addEventListener('click', (ev) => this.getParcelJSON(this.currentparcel));
*/
    this.buildMap();

    this.suntarget = room.createObject('object', {
      js_id: 'suntarget'
    });
/*
    this.sun = this.createObject('light', {
      col: V(1,1,1),
      light_intensity: 12,
      light_cone_angle: 1,
      light_range: 100,
      light_shadow: true,
      light_shadow_near: 80,
      light_shadow_far: 150,
      light_target: 'suntarget'
    });
*/
    this.sun = this.createObject('light', {
      col: 0x5988ff,
      light_intensity: 6,
      light_range: 200,
      light_shadow: true,
      light_shadow_near: 20,
      light_shadow_far: 250,
/*
      light_target: 'suntarget'
*/
    });
    this.torch = this.createObject('light', {
      col: 0xffffcc,
      light_intensity: 10,
      light_range: 20,
      light_shadow: true,
      light_shadow_near: .5,
      light_shadow_far: 20
    });
    this.loadEstateData();
  },
  update() {
    player.movestrength = 100 * Math.max(0.5, Math.min(150, player.pos.y));
    player.runstrength = 125 * Math.max(0.5, Math.min(150, player.pos.y));
    let height = player.pos.y;
    if (height < 0) {
      height = player.pos.y = 0;
    }
    for (let parcelid in this.maptiles) {
      let t = this.maptiles[parcelid],
          imageid = `dcl_maptile_${parcelid}`;

      if (player.pos.y > 75 || player.pos.distanceTo(t.pos) > 400) {
        imageid += '_linear';
      }

      if (t.image_id != imageid) {
        t.image_id = imageid;
      }
    }

    let parcelxy = this.getCurrentParcelXY();
    if (!(this.currentparcel[0] == parcelxy[0] && this.currentparcel[1] == parcelxy[1])) {
      console.log('parcel changed', parcelxy);
      this.getParcelsNear(parcelxy[0], parcelxy[1]);
      this.currentparcel = parcelxy;
/*
      this.currentparcelobj.pos.x = parcelxy[0] * 10;
      this.currentparcelobj.pos.z = -parcelxy[1] * 10;

      this.currentparcellabel.pos.x = parcelxy[0] * 10;
      this.currentparcellabel.pos.z = -parcelxy[1] * 10;
      this.currentparcellabel.text = this.parcelID(parcelxy[0], parcelxy[1]);
*/
    }

    this.sun.pos = V(player.pos.x + 50, 50, player.pos.z + 20);
    this.torch.pos = V(player.pos.x, player.pos.y + 1, player.pos.z + .25);
    if (player.pos.y > 10) {
      room.fog_end = 200 + (200 * Math.sqrt(player.pos.y - 10));
    } else if (room.fog_end != 200) {
      room.fog_end = 200;
    }
/*
    this.suntarget.pos = V(player.pos.x, 0, player.pos.z);
    this.sun._target.light.shadow.camera.near = 90;
    this.sun._target.light.shadow.camera.far = 120;
    this.sun._target.light.shadow.camera.left = -20;
    this.sun._target.light.shadow.camera.right = 20;
    this.sun._target.light.shadow.camera.top = 20;
    this.sun._target.light.shadow.camera.bottom = -20;
    this.sun._target.light.shadow.camera.updateProjectionMatrix();
*/
    if (height > 100 && room.near_dist != 1) {
      room.near_dist = 1;
      room.far_dist = 5000;
    } else if (height <= 100 && room.near_dist != .01) {
      room.near_dist = .01;
    }
  },
  buildMap() {
    // Decentraland's parcels range from -150,-150 to 150,150, making a total of 90,000 total parcels available
    // They provide an API which gives us map tiles centered around a given parcel
    // https://docs.decentraland.org/decentraland/api/#map

    let size = 50,
        scale = 10;
    this.maptiles = {};

    // Create an invisible collider cube under the map
    this.createObject('object', {
      collision_id: 'cube',
      scale: [5000, 10, 5000],
      pos: [0, -5.25, 0]
    });


    for (let x = -150 + size/2; x < 150 + size/2; x += size) {
      for (let y = -150 + size/2; y < 150 + size/2; y += size) {
        let url = `https://api.decentraland.org/v1/parcels/${x}/${y}/map.png?size=10`;
        let parcelid = this.parcelID(x, y),
            imageid = `dcl_maptile_${parcelid}`;
            
        room.loadNewAsset('image', {
          id: imageid,
          src: url,
          tex_linear: false
        });
        room.loadNewAsset('image', {
          id: imageid + '_linear',
          src: url,
          tex_linear: true
        });
        this.maptiles[parcelid] = this.createObject('object', {
          id: 'plane',
          image_id: imageid,
          pos: [x * scale, -.05, -y * scale],
          scale: [size * scale, size * scale, 1],
          col: V(1, 1, 1),
          rotation: [-90, 0, 0],
        });
      }
    }
  },
  parcelID(x, y) {
    return `${x},${y}`;
  },
  getParcelMetadata(x, y) {
    return new Promise((resolve, reject) => {
      let parcelid = this.parcelID(x, y);
      if (this.parceldata[parcelid]) {
        let data = this.parceldata[parcelid];
        if (data.ok) {
          resolve(data);
        } else {
          reject(data);
        }
      } else if (this.parceldata[parcelid] !== false) {
        fetch(`https://ipfs.decentraland.org/api/v1/resolve/${x}/${y}`).then(d => {
          d.json().then(j => {
            this.parceldata[parcelid] = j;
            if (j.ok) {
              resolve(this.parceldata[parcelid]);
            } else {
              this.parceldata[parcelid] = false;
              reject(this.parceldata[parcelid]);
            }
          }).catch(d => {
  console.log('no parcel', x, y);
          });
        });
      }
    });
  },
  getCurrentParcelID() {
    let parcelxy = this.getCurrentParcelXY();
    return this.parcelID(parcelxy[0], parcelxy[1]);
  },
  getCurrentParcelXY() {
    return [Math.round(player.pos.x / 10), Math.round(-player.pos.z / 10)];
  },
  getRecentlyUpdatedParcels() {
    fetch('https://api.decentraland.org/v1/parcels?limit=500&sort_by=block_time_updated_at').then(d => {
      d.json().then(j => console.log(j));
    });
  },
  loadParcel(x, y, locationdata) {
console.log('load new parcel', x, y);
    let parcelid = this.parcelID(x, y);

    if (!this.parcels[parcelid]) {
      this.parcels[parcelid] = this.createObject('dcl_parcel', {
        js_id: 'parcel_' + parcelid,
        x: x,
        y: y
      });
    } else {
      console.log('Parcel ' + parcelid + ' already loaded');
    }
  },
  fillParcel(x, y) {
    let parcelid = this.parcelID(x, y);
    let rootparcel = this.lookupRootParcel(x, y);
    if (rootparcel) {
      parcelid = rootparcel;
      let xy = parcelid.split(',');
      x = xy[0];
      y = xy[1];
    }

    if (!this.parcels[parcelid] && this.parceldata[parcelid] !== false) {
      this.getParcelMetadata(x, y).then(d => {
        //console.log('got parcel data:', [x, y], d);
        this.loadParcel(x, y);
      });
    }
  },
  getParcelsNear(x, y) {
    this.fillParcel(x, y);
    let prevx = x - 1,
        nextx = x + 1,
        prevy = y - 1,
        nexty = y + 1;

    this.fillParcel(prevx, prevy);
    this.fillParcel(x, prevy);
    this.fillParcel(nextx, prevy);
    this.fillParcel(prevx, y);
    this.fillParcel(nextx, y);
    this.fillParcel(prevx, nexty);
    this.fillParcel(x, nexty);
    this.fillParcel(nextx, nexty);
  },
  loadEstateData() {
    fetch('https://baicoianu.com/~bai/dcl/scenes/allparcels.json').then(d => {
      d.json().then(j => {
        for (let rootparcel in j) {
          for (let i in j[rootparcel]) {
            let parcelid = j[rootparcel][i];
            this.rootparcels[parcelid] = rootparcel;
          }
        }
      });
    });
  },
  lookupRootParcel(x, y) {
    let parcelid = this.parcelID(x, y);
    if (this.rootparcels[parcelid]) {
      return this.rootparcels[parcelid];
    }
    return false;
  }
});

room.registerElement('dcl_parcel', {
  x: 0,
  y: 0,

  create() {
    this.pos = V(this.x * 10, 0, -this.y * 10);
    this.marker = this.createObject('object', {
      id: 'cube',
      scale: [1, 10, 1],
      col: 'yellow'
    });
    this.load();
  },
  load() {
    console.log('Loading', this.x, this.y);
    this.files = {};
    this.parent.getParcelMetadata(this.x, this.y).then(d => {
      if (d.ok) {
        this.baseurl = `https://ipfs.decentraland.org/api/v1/get/${d.url.ipfs}/`;
        console.log('GET FILES', this.x, this.y, this.baseurl, d.url);
        if (d.url && d.url.dependencies) {
          let deps = d.url.dependencies;
          for (let i = 0; i < deps.length; i++) {
            this.files[deps[i].path] = deps[i];
            this.files[deps[i].path].fullurl = this.baseurl + deps[i].path;
          }
        }
console.log('done!', this.files);
        if (this.files['/scene.xml']) {
console.log('has a scene.xml, fetch it');
          this.marker.col = 'lightgreen';
          this.marker.visible = false;
          this.fetch('/scene.xml').then(f => this.loadScene(f));
        } else {
console.log('no scene.xml, probably dynamic');
          this.marker.col = 'red';
        }
      }
    });
  },
  loadScene(scenefile) {
    console.log('loaded scene file for ' + this.x + ',' + this.y + ' from ipfs!', scenefile);
    let dclsrc = scenefile.replace('<scene', '<scene baseurl="' + this.baseurl + '"');
    let jml = `
<fireboxroom>
  <assets>
    <assetscript src="https://baicoianu.com/~bai/highfidelity/dcl2jml.js"/>
  </assets>
  <room>
    ${dclsrc}
  </room>
</fireboxroom>`;

    this.zone = this.createObject('zone', {
      code: jml,
      pos: V(-5, 0, -5),
      baseurl: this.baseurl
    });
  },
  fetch(fname) {
    return new Promise((resolve, reject) => {
      let fdata = this.files[fname];
      if (fdata) {
        let url = `https://ipfs.decentraland.org/api/v1/get/${fdata.src}${fdata.path}`;
        fetch(url).then(r => {
          r.text().then(t => {
            resolve(t);
          });
        })
      }
    });
  }
});

room.registerElement('zone', {
  src: '',
  code: '',
  baseurl: false,

  create() {
console.log('create new zone', this);
    if (this.code) {
      this.loadFromSource(this.code);
    }
  },
  
  loadFromSource(src) {
    let data = janus.parser.parse(src, this.baseurl);
console.log('load zone from source', src);
    this.loadRoomAssets(data.assets.assetlist);
    this.createRoomObjects(data);
  },
  loadRoomAssets(assetlist) {
    if (assetlist && assetlist.length > 0) {
console.log('define assets', assetlist);
      if (!this.assetpack) {
        this.assetpack = new elation.engine.assets.pack({name: this.id + '_assets', baseurl: this.baseurl, json: assetlist});
      } else {
        this.assetpack.loadJSON(assetlist);
      }
    }
  },
  createRoomObjects(data) {
console.log('create the room objects!', data);
    if (data.room && data.room._children) {
      let children = data.room._children;
      for (let k in children) {
        let typelist = children[k];
        if (k != '#text' && typelist.length > 0) {
          for (let i = 0; i < typelist.length; i++) {
            let child = typelist[i];
            let newobj = this.createObject(k, child);
console.log(' - ' + k, child, newobj);
          }
        }
      }
    }
  }
});
