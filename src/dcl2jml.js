room.registerElement('dclbase', {
  position: [0,0,0],
  color: [1,1,1],
  baseurl: null,

  create() {
    this.initDCLProps();
  },
  initDCLProps() {
    // Set any Janus properties from their DCL-named counterparts
    this.pos = this.position;
    this.col = this.color;
  }
});
room.extendElement('dclbase', 'scene', {});
room.extendElement('dclbase', 'box', {
  create() {
    this.createObject('object', {
      id: 'cube',
      collision_id: 'cube',
      col: this.color
    });
    this.initDCLProps();
  }
});
room.extendElement('dclbase', 'sphere', {
  radius: 1,

  create() {
    this.createObject('object', {
      id: 'sphere',
      scale: V(this.radius),
      collision_id: 'sphere',
      col: this.color
    });
    this.initDCLProps();
  }
});
room.extendElement('dclbase', 'cylinder', {
  radius: 1,
  height: 1,

  create() {
    this.createObject('object', {
      id: 'cylinder',
      scale: V(this.radius, this.height, this.radius),
      collision_id: 'cylinder',
      col: this.color
    });
    this.initDCLProps();
  }
});
room.extendElement('dclbase', 'plane', {
  width: 1,
  height: 1,

  create() {
    this.createObject('object', {
      id: 'plane',
      scale: V(this.width, this.height, 1),
      collision_id: 'plane',
      col: this.color
    });
    this.initDCLProps();
  }
});
room.extendElement('dclbase', 'gltf-model', {
  src: null,

  create() {
    room.loadNewAsset('model', {
      id: this.src,
      src: this.parent.baseurl + this.src
    });

    this.model = this.createObject('object', {
      id: this.src,
      //collision_id: this.src,
    });
    this.model.addEventListener('load', (ev) => this.processModel());
    this.initDCLProps();
  },
  processModel() {
    let obj = this.model.objects['3d'];

    // Extract colliders
    let colliders = [];
    let collisionmesh = obj.getObjectByName('Collisions');
    if (collisionmesh) {
      colliders.push(collisionmesh);
    }
    obj.traverse((n) => {
      if (n.name && n.name.match(/_collider$/)) {
        colliders.push(n);
      }
    });

    for (let i = 0; i < colliders.length; i++) {
      let collider = colliders[i];
      collider.parent.remove(collider);
      // FIXME - probably losing some hierarchy data here...
      //this.colliders.add(collider);
    }
    //this.mergeModel();
  },
  mergeModel() {
    let root = this.objects['3d'];
    let newgeo = new THREE.BufferGeometry();
    let materials = [new THREE.MeshBasicMaterial({color: 0xff0000})];
  
    root.traverse(n => {
      if (n instanceof THREE.Mesh) {
        n.updateMatrixWorld();
        // FIXME BufferGeometry.merge() doesn't actully work
        newgeo.merge(n.geometry, n.matrixWorld);
      }
    });
    this.objects['3d'].parent.remove(this.objects['3d']);
    this.objects['3d'] = new THREE.Mesh(newgeo, materials);
  }

})
