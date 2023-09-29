import { Earth } from '@app/js/singletons/draw-manager/earth';
import { mat4 } from 'gl-matrix';

describe('Earth', () => {
    it('updates the model-view matrix correctly', () => {
        const earth = new Earth();
        const gmst = 0.5;
        const j = 0.25;
        earth.update(gmst, j);
        const expected = mat4.create();
        mat4.identity(expected);
        mat4.rotateZ(expected, expected, gmst);
        const actual = earth['mvMatrix_'];
        expect(actual).toEqual(expected);
    });
});