
		AFRAME.registerComponent('wobble-normal', {
			schema: {
				variance: { default: 0.5 },
				amplitude: { default: 1 },
				offset: { default: 0 }
			},
			tick: function (t) {
				this.el.components.material.material.normalMap.offset.x += 0.00001 * Math.sin(t/10000);
				this.el.components.material.material.normalMap.offset.y += 0.00001 * Math.cos(t/8000);
				this.el.components.material.material.normalScale.x = this.data.offset + this.data.amplitude * (1-this.data.variance + this.data.variance * Math.cos(t/1000));
				this.el.components.material.material.normalScale.x = this.data.offset +this.data.amplitude * (1-this.data.variance + this.data.variance * Math.sin(t/1200));
			}
		});
		AFRAME.registerComponent('slide-normal', {
			schema: {},
			tick: function (t) {
				if (this.el.components.material.material && this.el.components.material.material.normalMap) this.el.components.material.material.normalMap.offset.y -= 0.0003;
			}
		});